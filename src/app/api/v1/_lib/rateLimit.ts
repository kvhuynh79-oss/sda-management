/**
 * REST API Rate Limiting (S16)
 *
 * In-memory rate limiter for REST API endpoints.
 * Uses a sliding window counter per API key.
 *
 * Note: In-memory rate limiting resets on server restart and is per-instance.
 * For multi-instance deployments, consider using Redis or a database-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

/**
 * Check rate limit for a given key (typically the API key ID).
 *
 * @param key - Unique identifier for rate limiting (e.g., API key ID)
 * @param maxRequests - Maximum requests allowed in the window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Whether the request is allowed and retry-after if not
 */
export function checkRateLimit(
  key: string,
  maxRequests = 100,
  windowMs = 60000
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Build standard rate limit response headers.
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  maxRequests = 100
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(result.remaining ?? 0),
    ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
  };
}