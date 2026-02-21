import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

/**
 * Session-Token Authentication Middleware for Widget API (S11 Updated)
 *
 * Validates session tokens from EITHER:
 * 1. HttpOnly cookie "sda_session" (preferred, S11 secure method)
 * 2. Authorization header Bearer token (legacy fallback, deprecated)
 *
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

const SESSION_COOKIE_NAME = "sda_session";

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
 * Extract session token from request.
 *
 * Priority:
 * 1. HttpOnly cookie "sda_session" (S11 - preferred)
 * 2. Authorization: Bearer <token> header (legacy, with deprecation warning)
 *
 * @returns The token string, or null if not found
 */
function extractSessionToken(request: Request): { token: string; source: "cookie" | "header" } | null {
  // 1. Check HttpOnly cookie first (S11)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map(c => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
        const token = cookie.slice(SESSION_COOKIE_NAME.length + 1).trim();
        if (token) {
          return { token, source: "cookie" };
        }
      }
    }
  }

  // 2. Fall back to Authorization header (legacy)
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      console.warn(
        "[SESSION-AUTH] DEPRECATION WARNING: Using Authorization header for session auth. " +
        "Migrate to HttpOnly cookie-based auth (S11). Header-based session auth will be " +
        "removed in a future release."
      );
      return { token, source: "header" };
    }
  }

  return null;
}

/**
 * Authenticate an incoming request using a session token.
 *
 * Extracts the session token from cookies (preferred) or Authorization header
 * (legacy fallback), validates it against Convex, and returns the user and
 * organization context on success.
 *
 * @param request - The incoming Next.js request
 * @returns Either a SessionAuthSuccess or SessionAuthError
 */
export async function authenticateSessionRequest(
  request: Request
): Promise<SessionAuthSuccess | SessionAuthError> {
  const extracted = extractSessionToken(request);

  if (!extracted) {
    return {
      error: "Missing session token. Provide via HttpOnly cookie or Authorization: Bearer <session_token> header.",
      status: 401,
    };
  }

  const { token } = extracted;

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
