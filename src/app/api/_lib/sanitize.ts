/**
 * Input Sanitization Utilities for API Endpoints
 *
 * SECURITY: Provides functions to sanitize user input before processing.
 * Strips HTML/script tags, validates email format, and enforces field lengths.
 */

/**
 * Strip HTML and script tags from a string.
 * Prevents XSS if the value is ever rendered in HTML context.
 */
export function stripHtmlTags(input: string): string {
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

/**
 * Sanitize and truncate a text field.
 *
 * @param input - Raw input value
 * @param maxLength - Maximum allowed length after sanitization
 * @returns Sanitized, truncated string
 */
export function sanitizeTextField(input: unknown, maxLength: number): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  const sanitized = stripHtmlTags(str);
  return sanitized.substring(0, maxLength);
}

/**
 * Validate email format using a reasonable regex.
 *
 * This is intentionally not a full RFC 5322 validator - it catches
 * the most common invalid formats while allowing legitimate addresses.
 *
 * @param email - Email address to validate
 * @returns true if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Reasonable email regex that catches most invalid formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Check if a string contains only whitespace or is empty after trimming.
 */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return String(value).trim().length === 0;
}

/**
 * Bot detection: check honeypot field.
 *
 * A honeypot field is a hidden form field that legitimate users never fill in.
 * If it has a value, the submitter is likely a bot.
 *
 * @param value - The honeypot field value
 * @returns true if the value indicates bot activity
 */
export function isHoneypotFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

/**
 * Bot detection: check form submission timing.
 *
 * Legitimate users take at least a few seconds to fill out a form.
 * Bots typically submit instantly. If the form was loaded less than
 * the minimum seconds ago, it's likely automated.
 *
 * @param formLoadedAt - Timestamp (ms) when the form was loaded on the client
 * @param minSeconds - Minimum expected time to fill the form (default: 3)
 * @returns true if the submission is suspiciously fast
 */
export function isSubmissionTooFast(
  formLoadedAt: unknown,
  minSeconds: number = 3
): boolean {
  if (formLoadedAt === null || formLoadedAt === undefined) return false;

  const loadedAt = Number(formLoadedAt);
  if (isNaN(loadedAt) || loadedAt <= 0) return false;

  const elapsed = Date.now() - loadedAt;
  return elapsed < minSeconds * 1000;
}
