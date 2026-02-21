/**
 * Shared validation utilities for email and phone fields.
 * Used by both Convex mutations (server-side) and client-side forms.
 */

// Email: standard RFC-compatible regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email address format.
 * Returns true if the email matches standard email format.
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// Australian phone: landline (02-09) or mobile (04), with optional +61 prefix
// Accepts spaces and hyphens (stripped before testing).
const AU_PHONE_REGEX = /^(\+61|0)[2-9]\d{8}$/;

/**
 * Validate an Australian phone number.
 * Strips spaces and hyphens before testing.
 * Accepts formats: 0412345678, +61412345678, 02 1234 5678, etc.
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return AU_PHONE_REGEX.test(cleaned);
}

/**
 * Assert a valid email and throw a clear error if invalid.
 * Call from Convex mutations before storing email fields.
 */
export function assertValidEmail(email: string, fieldName = "Email"): void {
  if (!validateEmail(email)) {
    throw new Error(`${fieldName} "${email}" is not a valid email address`);
  }
}

/**
 * Assert a valid Australian phone number and throw a clear error if invalid.
 * Call from Convex mutations before storing phone fields.
 */
export function assertValidPhone(phone: string, fieldName = "Phone"): void {
  if (!validatePhone(phone)) {
    throw new Error(
      `${fieldName} "${phone}" is not a valid Australian phone number. Expected format: 04XX XXX XXX or +614XXXXXXXX`
    );
  }
}
