import { ConvexHttpClient } from "convex/browser";
import { checkRateLimit, rateLimitHeaders, type RateLimitResult } from "./rateLimit";
import { api } from "../../../../../convex/_generated/api";

/**
 * REST API Authentication Middleware - Sprint 7
 *
 * Validates API keys from the Authorization header (Bearer token).
 * Keys are validated via Convex mutation which hashes the key and
 * checks it against the database.
 *
 * Security notes:
 * - API keys are SHA-256 hashed in the database (never stored in plain text)
 * - Keys use the `msd_live_` prefix for easy identification
 * - Each key has scoped permissions (read:*, write:* per resource)
 * - Keys are tied to an organization for tenant isolation
 * - This auth mechanism is sufficient CSRF protection for API endpoints:
 *   API keys are not stored in cookies/localStorage by browsers, so CSRF
 *   attacks cannot forge requests with valid API keys
 *
 * Usage in route handlers:
 * ```ts
 * const auth = await authenticateApiRequest(request);
 * if ("error" in auth) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * // auth.organizationId, auth.permissions, auth.keyId now available
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
 * Result type for successful authentication.
 */
export interface ApiAuthSuccess {
  organizationId: string;
  permissions: string[];
  keyId: string;
  createdBy: string;
}

/**
 * Result type for authentication failure.
 */
export interface ApiAuthError {
  error: string;
  status: number;
  retryAfter?: number; // S16: seconds until rate limit resets
}

/**
 * Authenticate an incoming API request using the Bearer token.
 *
 * Extracts the API key from the Authorization header, validates it
 * against Convex, and returns the organization context on success.
 *
 * @param request - The incoming Next.js request
 * @returns Either an ApiAuthSuccess or ApiAuthError
 */
export async function authenticateApiRequest(
  request: Request
): Promise<ApiAuthSuccess | ApiAuthError> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: "Missing or invalid Authorization header. Expected: Bearer <api_key>",
      status: 401,
    };
  }

  const apiKey = authHeader.slice(7).trim();

  if (!apiKey) {
    return {
      error: "API key is empty",
      status: 401,
    };
  }

  // Validate key prefix format
  if (!apiKey.startsWith("msd_live_")) {
    return {
      error: "Invalid API key format",
      status: 401,
    };
  }

  try {
    const convex = getConvex();
    const result = await convex.mutation(api.apiKeys.validateApiKey, {
      key: apiKey,
    });

    if (!result.valid) {
      return {
        error: "Invalid or expired API key",
        status: 401,
      };
    }

    const authResult: ApiAuthSuccess = {
      organizationId: result.organizationId,
      permissions: result.permissions,
      keyId: result.keyId,
      createdBy: result.createdBy,
    };

    // S16: Automatic rate limiting on successful auth (100 req/min per API key)
    const rlResult = checkRateLimit(authResult.keyId, 100, 60000);
    if (!rlResult.allowed) {
      return {
        error: "Rate limit exceeded. Please retry later.",
        status: 429,
        retryAfter: rlResult.retryAfter,
      } as ApiAuthError;
    }

    // B7 FIX: Check subscription status — block suspended/cancelled orgs from API access
    if (result.subscriptionStatus) {
      const accessLevel = result.accessLevel ?? "full";
      const method = request.method?.toUpperCase() ?? "GET";
      const isReadOnly = method === "GET" || method === "HEAD" || method === "OPTIONS";

      if (accessLevel === "suspended" || result.subscriptionStatus === "canceled") {
        return {
          error: "Subscription inactive. Please visit your billing dashboard to reactivate.",
          status: 403,
        };
      }
      if (accessLevel === "read_only" && !isReadOnly) {
        return {
          error: "Account is in read-only mode due to overdue payment. Only GET requests are allowed.",
          status: 403,
        };
      }
    }

    return authResult;
  } catch (err) {
    console.error("[REST API] Authentication error:", err);
    return {
      error: "Authentication service unavailable",
      status: 503,
    };
  }
}

/**
 * Check if the authenticated API key has a specific permission.
 *
 * @param auth - The successful auth result
 * @param permission - The permission to check (e.g., "read:properties")
 * @returns true if the key has the permission
 */
export function hasPermission(
  auth: ApiAuthSuccess,
  permission: string
): boolean {
  return auth.permissions.includes(permission);
}

/**
 * Standard CORS headers for REST API responses.
 * Allows requests from any origin with Bearer auth.
 */
export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * S16: Check rate limit for an authenticated API request.
 * Call this after authenticateApiRequest succeeds.
 *
 * @param auth - Successful auth result (uses keyId as rate limit key)
 * @param maxRequests - Max requests per window (default 100)
 * @param windowMs - Window in ms (default 60s)
 * @returns null if allowed, or { headers, status } for 429 response
 */
export function checkApiRateLimit(
  auth: ApiAuthSuccess,
  maxRequests = 100,
  windowMs = 60000
): { headers: Record<string, string>; status: 429 } | null {
  const result = checkRateLimit(auth.keyId, maxRequests, windowMs);
  if (!result.allowed) {
    return {
      headers: { ...API_CORS_HEADERS, ...rateLimitHeaders(result, maxRequests) },
      status: 429,
    };
  }
  return null;
}
