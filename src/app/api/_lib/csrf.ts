/**
 * CSRF / Origin Validation for Public POST Endpoints
 *
 * SECURITY: Validates that POST requests to public form-submission endpoints
 * originate from allowed domains. This prevents cross-site request forgery
 * where a malicious site submits forms to our API.
 *
 * EXEMPT endpoints (use their own signature verification):
 * - /api/stripe/webhook  - Stripe signature (STRIPE_WEBHOOK_SECRET)
 * - /api/mail            - Postmark webhook secret (INBOUND_EMAIL_WEBHOOK_SECRET)
 *
 * EXEMPT endpoints (use API key / session token auth):
 * - /api/v1/*            - Bearer API key authentication
 *
 * PROTECTED endpoints (need Origin validation):
 * - /api/complaints/submit - Public complaint form submission
 *
 * Usage:
 * ```ts
 * import { validateOrigin } from "../../_lib/csrf";
 *
 * const originCheck = validateOrigin(request);
 * if (!originCheck.valid) {
 *   return NextResponse.json(
 *     { error: originCheck.error },
 *     { status: 403 }
 *   );
 * }
 * ```
 */

interface OriginValidationResult {
  valid: boolean;
  error?: string;
  origin?: string;
}

/**
 * Allowed origins for public form submissions.
 *
 * Includes:
 * - The main app domain (mysdamanager.com)
 * - The BLS website (external complaint form)
 * - localhost for development
 *
 * Note: The APP_URL env var can override the production domain if set.
 */
function getAllowedOrigins(): string[] {
  const origins = [
    "https://mysdamanager.com",
    "https://www.mysdamanager.com",
    "https://betterlivingsolutions.com.au",
    "https://www.betterlivingsolutions.com.au",
  ];

  // Add APP_URL if configured (for staging/preview environments)
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const url = new URL(appUrl);
      origins.push(url.origin);
    } catch {
      // Invalid URL, skip
    }
  }

  // Allow localhost in development
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://localhost:3001");
    origins.push("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * Validate the Origin header of an incoming request.
 *
 * For browser-initiated POST requests, the Origin header is automatically
 * set by the browser and cannot be forged by JavaScript. This makes it
 * a reliable CSRF protection mechanism.
 *
 * Behaviour:
 * - If Origin header is present: validates against allowed list
 * - If Origin header is absent but Referer is present: validates Referer origin
 * - If neither is present: rejects the request (likely non-browser or spoofed)
 *
 * @param request - The incoming request
 * @returns OriginValidationResult
 */
export function validateOrigin(request: Request): OriginValidationResult {
  const allowedOrigins = getAllowedOrigins();

  // Check Origin header first (set by browsers for POST requests)
  const origin = request.headers.get("origin");
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return { valid: true, origin };
    }
    return {
      valid: false,
      error: "Forbidden: request origin not allowed",
      origin,
    };
  }

  // Fallback: check Referer header (less reliable but still useful)
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.includes(refererUrl.origin)) {
        return { valid: true, origin: refererUrl.origin };
      }
    } catch {
      // Invalid referer URL
    }
    return {
      valid: false,
      error: "Forbidden: request origin not allowed",
      origin: referer,
    };
  }

  // Neither Origin nor Referer present.
  // This could be a server-to-server request or a non-browser client.
  // For public form endpoints, we reject these since legitimate browser
  // submissions always include Origin.
  return {
    valid: false,
    error: "Forbidden: missing origin header",
  };
}

/**
 * Validate origin with additional allowed origins (for CORS endpoints
 * that accept requests from external websites).
 *
 * @param request - The incoming request
 * @param additionalOrigins - Extra origins to allow beyond the defaults
 * @returns OriginValidationResult
 */
export function validateOriginWithExtras(
  request: Request,
  additionalOrigins: string[]
): OriginValidationResult {
  const allowedOrigins = [...getAllowedOrigins(), ...additionalOrigins];

  const origin = request.headers.get("origin");
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return { valid: true, origin };
    }
    return {
      valid: false,
      error: "Forbidden: request origin not allowed",
      origin,
    };
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.includes(refererUrl.origin)) {
        return { valid: true, origin: refererUrl.origin };
      }
    } catch {
      // Invalid referer URL
    }
    return {
      valid: false,
      error: "Forbidden: request origin not allowed",
      origin: referer,
    };
  }

  return {
    valid: false,
    error: "Forbidden: missing origin header",
  };
}
