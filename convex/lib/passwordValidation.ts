/**
 * Password Validation Module (S5 Fix)
 *
 * OWASP-compliant password complexity requirements.
 * Used by both registration and password change/reset flows.
 *
 * Requirements:
 * - Minimum 12 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 digit (0-9)
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * - Maximum 128 characters
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

// Special characters allowed in passwords
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/`~"\\]/;

/**
 * Validate password complexity against OWASP recommendations.
 * Returns an object with a `valid` boolean and an array of error messages.
 *
 * NOTE: This does NOT enforce on existing users. Only applied to new passwords.
 */
export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Password is required."] };
  }

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long.`);
  }

  if (password.length > MAX_LENGTH) {
    errors.push(`Password must be no more than ${MAX_LENGTH} characters long.`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least 1 uppercase letter (A-Z).");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least 1 lowercase letter (a-z).");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least 1 digit (0-9).");
  }

  if (!SPECIAL_CHARS.test(password)) {
    errors.push("Password must contain at least 1 special character (e.g. !@#$%^&*).");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Throw an error if the password does not meet complexity requirements.
 * Use this in Convex mutations/actions for server-side enforcement.
 */
export function requirePasswordComplexity(password: string): void {
  const result = validatePasswordComplexity(password);
  if (!result.valid) {
    throw new Error(
      "Password does not meet complexity requirements: " + result.errors.join(" ")
    );
  }
}
