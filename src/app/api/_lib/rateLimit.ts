/**
 * In-Memory Rate Limiter for Next.js API Routes (Vercel-compatible)
 *
 * SECURITY: Provides IP-based rate limiting for public endpoints.
 * Uses an in-memory Map with automatic TTL cleanup.
 *
 * Limitations:
 * - In-memory storage is per-instance. On Vercel, each serverless function
 *   invocation may run in a separate instance, so limits are approximate.
 * - For stricter enforcement, consider an external store (Redis/Upstash).
 * - Sufficient for deterring casual abuse and bot spam.
 *
 * Usage:
 * ```ts
 * import { checkRateLimit } from "../../_lib/rateLimit";
 *
 * const rateLimitResult = checkRateLimit(request, {
 *   windowMs: 60 * 60 * 1000,  // 1 hour
 *   maxRequests: 3,
 *   keyPrefix: "complaints",
 * });
 * if (!rateLimitResult.allowed) {
 *   return NextResponse.json(
 *     { error: rateLimitResult.error },
 *     { status: 429, headers: rateLimitResult.headers }
 *   );
 * }
 * ```
 */

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
}

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Prefix to namespace different rate limit buckets */
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  error?: string;
  headers: Record<string, string>;
}

// Global store: Map<compositeKey, RateLimitEntry>
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (runs every 5 minutes to evict expired entries)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanupRunning(maxWindowMs: number): void {
  if (cleanupInterval) return;
  const cleanupFrequencyMs = Math.min(maxWindowMs, 5 * 60 * 1000);
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Extract the window from the key prefix to determine TTL.
      // We use a generous 2x multiplier on the largest known window.
      if (now - entry.firstRequestAt > 48 * 60 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, cleanupFrequencyMs);

  // Allow Node.js to exit even if the interval is running (important for tests)
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

/**
 * Extract client IP address from the request.
 *
 * On Vercel, `x-forwarded-for` contains the client IP (first entry).
 * Falls back to `x-real-ip`, then "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first entry is the client
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}

/**
 * Check if a request is within rate limits.
 *
 * @param request - The incoming request (used to extract client IP)
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating whether the request is allowed
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanupRunning(config.windowMs);

  const ip = getClientIp(request);
  const key = `${config.keyPrefix}:${ip}`;
  const now = Date.now();

  const existing = rateLimitStore.get(key);

  if (!existing || now - existing.firstRequestAt > config.windowMs) {
    // No existing entry or window has expired - start fresh
    rateLimitStore.set(key, { count: 1, firstRequestAt: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": String(config.maxRequests - 1),
        "X-RateLimit-Reset": String(Math.ceil((now + config.windowMs) / 1000)),
      },
    };
  }

  // Window is still active
  existing.count += 1;

  if (existing.count > config.maxRequests) {
    const resetAt = existing.firstRequestAt + config.windowMs;
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      error: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        "Retry-After": String(retryAfterSeconds),
      },
    };
  }

  const remaining = config.maxRequests - existing.count;
  return {
    allowed: true,
    remaining,
    headers: {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(
        Math.ceil((existing.firstRequestAt + config.windowMs) / 1000)
      ),
    },
  };
}

/**
 * Apply multiple rate limit checks (e.g., hourly + daily).
 * Returns the first failure, or the most restrictive success.
 */
export function checkMultipleRateLimits(
  request: Request,
  configs: RateLimitConfig[]
): RateLimitResult {
  for (const config of configs) {
    const result = checkRateLimit(request, config);
    if (!result.allowed) {
      return result;
    }
  }
  // All passed - return the result of the last check (most restrictive by convention)
  return checkRateLimit(request, configs[configs.length - 1]);
}
