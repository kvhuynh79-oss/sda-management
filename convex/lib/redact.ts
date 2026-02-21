/**
 * Redaction utilities for sensitive fields in audit logs and webhook payloads.
 * Prevents PII and encrypted data from being stored in plain text
 * within audit trails and outbound webhook deliveries.
 */

// Fields that contain encrypted data at rest - must never appear in audit logs
const ENCRYPTED_FIELD_NAMES = new Set([
  "ndisNumber",
  "dateOfBirth",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelationship",
  "bankAccountNumber",
  "bsb",
  "accountName",
  "policeCheckNumber",
  "ndisWorkerScreeningNumber",
  "wwcNumber",
  "accessToken",
  "refreshToken",
  "mfaSecret",
  "mfaBackupCodes",
]);

// Additional PII fields that should not appear in webhook payloads
const PII_FIELD_NAMES = new Set([
  ...ENCRYPTED_FIELD_NAMES,
  "email",
  "phone",
  "mobile",
  "firstName",
  "lastName",
  "name",
  "fullName",
  "bankAccount",
  "dob",
  "address",
  "streetAddress",
]);

/**
 * Recursively redact fields from an object by field name.
 * Works on nested objects and arrays.
 */
function redactFields(
  obj: unknown,
  fieldSet: Set<string>,
  redactedValue: string
): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactFields(item, fieldSet, redactedValue));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (fieldSet.has(key) && value !== undefined && value !== null) {
      result[key] = redactedValue;
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactFields(value, fieldSet, redactedValue);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Redact encrypted/sensitive fields from an object before writing to audit logs.
 * Replaces values of known encrypted field names with "[ENCRYPTED]".
 *
 * @param obj - The object (or JSON string) containing potential sensitive fields
 * @returns The redacted object (or JSON string if string was passed)
 */
export function redactEncryptedFields(obj: unknown): unknown {
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      const redacted = redactFields(parsed, ENCRYPTED_FIELD_NAMES, "[ENCRYPTED]");
      return JSON.stringify(redacted);
    } catch {
      return obj;
    }
  }
  return redactFields(obj, ENCRYPTED_FIELD_NAMES, "[ENCRYPTED]");
}

/**
 * Redact PII fields from an object before sending in webhook payloads.
 * Replaces values of known PII field names with "[REDACTED]".
 * This is a superset of encrypted fields - includes email, name, phone, etc.
 *
 * @param obj - The object (or JSON string) containing potential PII
 * @returns The redacted object (or JSON string if string was passed)
 */
export function redactPII(obj: unknown): unknown {
  if (typeof obj === "string") {
    try {
      const parsed = JSON.parse(obj);
      const redacted = redactFields(parsed, PII_FIELD_NAMES, "[REDACTED]");
      return JSON.stringify(redacted);
    } catch {
      return obj;
    }
  }
  return redactFields(obj, PII_FIELD_NAMES, "[REDACTED]");
}