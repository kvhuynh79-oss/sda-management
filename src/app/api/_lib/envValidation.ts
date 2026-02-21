/**
 * Environment Variable Validation for API Routes
 *
 * SECURITY: Fail-fast validation ensures that required environment variables
 * are present before processing requests. This prevents confusing runtime
 * errors and ensures webhook signature verification is always possible.
 *
 * Usage:
 * ```ts
 * import { validateRequiredEnvVars } from "../../_lib/envValidation";
 *
 * const envCheck = validateRequiredEnvVars([
 *   "STRIPE_WEBHOOK_SECRET",
 *   "NEXT_PUBLIC_CONVEX_URL",
 * ]);
 * if (!envCheck.valid) {
 *   console.error(`[CRITICAL] ${envCheck.error}`);
 *   return NextResponse.json({ error: "Service not configured" }, { status: 500 });
 * }
 * ```
 */

interface EnvValidationResult {
  valid: boolean;
  error?: string;
  /** Names of the missing environment variables (for logging, never expose to client) */
  missingVars?: string[];
}

/**
 * Validate that all required environment variables are set and non-empty.
 *
 * IMPORTANT: The error message includes variable names for server-side logging
 * only. Never return `missingVars` or `error` directly to the client -
 * use a generic error message instead.
 *
 * @param requiredVars - Array of environment variable names to check
 * @returns EnvValidationResult
 */
export function validateRequiredEnvVars(
  requiredVars: string[]
): EnvValidationResult {
  const missing: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim().length === 0) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required environment variable(s): ${missing.join(", ")}`,
      missingVars: missing,
    };
  }

  return { valid: true };
}

/**
 * Validate a specific environment variable and return its value.
 *
 * Useful for inline checks where you need the value immediately.
 *
 * @param varName - Name of the environment variable
 * @returns The value if set, or null if missing/empty
 */
export function getRequiredEnvVar(varName: string): string | null {
  const value = process.env[varName];
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value;
}
