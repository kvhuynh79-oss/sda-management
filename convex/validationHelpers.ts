// Common validation functions for input validation

// Error class for validation errors
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Validate required string fields
export function validateRequiredString(value: unknown, fieldName: string): string {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
  return value.trim();
}

// Validate optional string fields (returns undefined if empty)
export function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Validate email format
export function validateEmail(email: string, fieldName: string = "email"): string {
  const validated = validateRequiredString(email, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(validated)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
  return validated.toLowerCase();
}

// Validate optional email
export function validateOptionalEmail(email: unknown, fieldName: string = "email"): string | undefined {
  const validated = validateOptionalString(email, fieldName);
  if (!validated) return undefined;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(validated)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
  return validated.toLowerCase();
}

// Validate Australian phone number
export function validatePhone(phone: string, fieldName: string = "phone"): string {
  const validated = validateRequiredString(phone, fieldName);
  // Remove all non-digit characters except +
  const cleaned = validated.replace(/[^\d+]/g, "");
  // Australian phone: starts with 0 or +61, followed by 9 digits
  const phoneRegex = /^(\+?61|0)\d{9}$/;
  if (!phoneRegex.test(cleaned)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
  return cleaned;
}

// Validate optional phone
export function validateOptionalPhone(phone: unknown, fieldName: string = "phone"): string | undefined {
  const validated = validateOptionalString(phone, fieldName);
  if (!validated) return undefined;
  const cleaned = validated.replace(/[^\d+]/g, "");
  // Allow empty or valid Australian phone
  if (cleaned.length === 0) return undefined;
  const phoneRegex = /^(\+?61|0)\d{9}$/;
  if (!phoneRegex.test(cleaned)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
  return cleaned;
}

// Validate NDIS number (format: XXX XXX XXX or XXXXXXXXX)
export function validateNdisNumber(ndisNumber: string, fieldName: string = "NDIS number"): string {
  const validated = validateRequiredString(ndisNumber, fieldName);
  // Remove spaces
  const cleaned = validated.replace(/\s/g, "");
  // Must be 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    throw new ValidationError(`${fieldName} must be 9 digits`, fieldName);
  }
  return cleaned;
}

// Validate Australian postcode (4 digits)
export function validatePostcode(postcode: string, fieldName: string = "postcode"): string {
  const validated = validateRequiredString(postcode, fieldName);
  if (!/^\d{4}$/.test(validated)) {
    throw new ValidationError(`${fieldName} must be 4 digits`, fieldName);
  }
  return validated;
}

// Validate date string (YYYY-MM-DD format)
export function validateDate(date: string, fieldName: string = "date"): string {
  const validated = validateRequiredString(date, fieldName);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(validated)) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format`, fieldName);
  }
  const parsed = new Date(validated);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date`, fieldName);
  }
  return validated;
}

// Validate optional date
export function validateOptionalDate(date: unknown, fieldName: string = "date"): string | undefined {
  const validated = validateOptionalString(date, fieldName);
  if (!validated) return undefined;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(validated)) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format`, fieldName);
  }
  const parsed = new Date(validated);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date`, fieldName);
  }
  return validated;
}

// Validate number is positive
export function validatePositiveNumber(value: number, fieldName: string): number {
  if (typeof value !== "number" || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName);
  }
  if (value < 0) {
    throw new ValidationError(`${fieldName} must be positive`, fieldName);
  }
  return value;
}

// Validate percentage (0-100)
export function validatePercentage(value: number, fieldName: string): number {
  const validated = validatePositiveNumber(value, fieldName);
  if (validated > 100) {
    throw new ValidationError(`${fieldName} must be between 0 and 100`, fieldName);
  }
  return validated;
}

// Validate ABN (11 digits)
export function validateAbn(abn: string, fieldName: string = "ABN"): string {
  const validated = validateRequiredString(abn, fieldName);
  // Remove spaces
  const cleaned = validated.replace(/\s/g, "");
  // Must be 11 digits
  if (!/^\d{11}$/.test(cleaned)) {
    throw new ValidationError(`${fieldName} must be 11 digits`, fieldName);
  }
  return cleaned;
}

// Validate optional ABN
export function validateOptionalAbn(abn: unknown, fieldName: string = "ABN"): string | undefined {
  const validated = validateOptionalString(abn, fieldName);
  if (!validated) return undefined;
  const cleaned = validated.replace(/\s/g, "");
  if (cleaned.length === 0) return undefined;
  if (!/^\d{11}$/.test(cleaned)) {
    throw new ValidationError(`${fieldName} must be 11 digits`, fieldName);
  }
  return cleaned;
}

// Validate BSB (6 digits with optional hyphen)
export function validateBsb(bsb: string, fieldName: string = "BSB"): string {
  const validated = validateRequiredString(bsb, fieldName);
  // Remove hyphen
  const cleaned = validated.replace(/-/g, "");
  // Must be 6 digits
  if (!/^\d{6}$/.test(cleaned)) {
    throw new ValidationError(`${fieldName} must be 6 digits`, fieldName);
  }
  return cleaned;
}

// Validate optional BSB
export function validateOptionalBsb(bsb: unknown, fieldName: string = "BSB"): string | undefined {
  const validated = validateOptionalString(bsb, fieldName);
  if (!validated) return undefined;
  const cleaned = validated.replace(/-/g, "");
  if (cleaned.length === 0) return undefined;
  if (!/^\d{6}$/.test(cleaned)) {
    throw new ValidationError(`${fieldName} must be 6 digits`, fieldName);
  }
  return cleaned;
}

// Validate bank account number (6-10 digits)
export function validateAccountNumber(accountNumber: string, fieldName: string = "account number"): string {
  const validated = validateRequiredString(accountNumber, fieldName);
  // Remove spaces
  const cleaned = validated.replace(/\s/g, "");
  // Must be 6-10 digits
  if (!/^\d{6,10}$/.test(cleaned)) {
    throw new ValidationError(`${fieldName} must be 6-10 digits`, fieldName);
  }
  return cleaned;
}

// Validate string length
export function validateStringLength(
  value: string,
  fieldName: string,
  options: { min?: number; max?: number }
): string {
  const validated = validateRequiredString(value, fieldName);
  if (options.min && validated.length < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min} characters`, fieldName);
  }
  if (options.max && validated.length > options.max) {
    throw new ValidationError(`${fieldName} must be at most ${options.max} characters`, fieldName);
  }
  return validated;
}

// Sanitize HTML to prevent XSS
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
