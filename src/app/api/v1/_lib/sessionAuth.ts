import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

/**
 * Session-Token Authentication Middleware for Widget API
 *
 * Validates session tokens from the Authorization header (Bearer token).
 * Unlike the API key auth (auth.ts), this authenticates end users via their
 * session tokens (stored as sda_session_token on the client).
 *
 * Used by the native home-screen widget to fetch user-specific data.
 *
 * Usage in route handlers:
 * ```ts
 * const auth = await authenticateSessionRequest(request);
 * if ("error" in auth) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * // auth.userId, auth.organizationId now available
 * ```
 */

// Lazy-initialize ConvexHttpClient to avoid build-time errors
// when environment variables are not yet set.
let _convex: ConvexHttpClient | null = null;

function getConvex(): ConvexHttpClient {
  if (!_convex) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    }
    _convex = new ConvexHttpClient(url);
  }
  return _convex;
}

/**
 * Result type for successful session authentication.
 */
export interface SessionAuthSuccess {
  userId: Id<"users">;
  organizationId: Id<"organizations">;
}

/**
 * Result type for session authentication failure.
 */
export interface SessionAuthError {
  error: string;
  status: number;
}

/**
 * Authenticate an incoming request using a session Bearer token.
 *
 * Extracts the session token from the Authorization header, validates it
 * against Convex, and returns the user and organization context on success.
 *
 * @param request - The incoming Next.js request
 * @returns Either a SessionAuthSuccess or SessionAuthError
 */
export async function authenticateSessionRequest(
  request: Request
): Promise<SessionAuthSuccess | SessionAuthError> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: "Missing or invalid Authorization header. Expected: Bearer <session_token>",
      status: 401,
    };
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return {
      error: "Session token is empty",
      status: 401,
    };
  }

  try {
    const convex = getConvex();

    // Step 1: Validate the session token and get user info
    const session = await convex.query(api.auth.validateSession, { token });

    if (!session) {
      return {
        error: "Invalid or expired session token",
        status: 401,
      };
    }

    // Step 2: Get user details including organizationId
    const user = await convex.query(api.auth.getUser, {
      userId: session._id as Id<"users">,
    });

    if (!user) {
      return {
        error: "User not found",
        status: 401,
      };
    }

    if (!user.organizationId) {
      return {
        error: "User is not associated with an organization",
        status: 403,
      };
    }

    return {
      userId: session._id as Id<"users">,
      organizationId: user.organizationId as Id<"organizations">,
    };
  } catch (err) {
    console.error("[Widget API] Session authentication error:", err);
    return {
      error: "Authentication service unavailable",
      status: 503,
    };
  }
}
