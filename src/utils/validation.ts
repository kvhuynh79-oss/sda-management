/**
 * Client-side validation utilities for email and phone fields.
 * Mirrors the server-side validation in convex/lib/validation.ts.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate an email address format. */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

// Australian phone: landline (02-09) or mobile (04), with optional +61 prefix
const AU_PHONE_REGEX = /^(\+61|0)[2-9]\d{8}$/;

/** Validate an Australian phone number. Strips spaces and hyphens. */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return AU_PHONE_REGEX.test(cleaned);
}

/**
 * Return a validation error string or null if valid.
 * Suitable for inline form error messages.
 */
export function getEmailError(email: string): string | null {
  if (!email) return null; // empty is ok (field may be optional)
  if (!validateEmail(email)) return "Please enter a valid email address";
  return null;
}

/**
 * Return a validation error string or null if valid.
 * Suitable for inline form error messages.
 */
export function getPhoneError(phone: string): string | null {
  if (!phone) return null; // empty is ok (field may be optional)
  if (!validatePhone(phone)) return "Please enter a valid Australian phone number (e.g. 04XX XXX XXX)";
  return null;
}
