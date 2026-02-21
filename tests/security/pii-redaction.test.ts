import { describe, it, expect } from "vitest";
import { redactEncryptedFields, redactPII } from "../../convex/lib/redact";

/**
 * Security Tests: PII Redaction
 *
 * Verifies that sensitive data is properly redacted before being
 * written to audit logs or sent in webhook payloads.
 * Critical for NDIS compliance and Australian Privacy Act (APP).
 */

describe("PII Redaction Security", () => {
  // -------------------------------------------------------------------------
  // NDIS-specific sensitive fields
  // -------------------------------------------------------------------------
  describe("NDIS-sensitive field redaction", () => {
    it("redacts NDIS participant number", () => {
      const result = redactEncryptedFields({
        ndisNumber: "430123456",
      }) as Record<string, unknown>;
      expect(result.ndisNumber).toBe("[ENCRYPTED]");
    });

    it("redacts date of birth", () => {
      const result = redactEncryptedFields({
        dateOfBirth: "1985-03-15",
      }) as Record<string, unknown>;
      expect(result.dateOfBirth).toBe("[ENCRYPTED]");
    });

    it("redacts emergency contact information", () => {
      const result = redactEncryptedFields({
        emergencyContactName: "Jane Smith",
        emergencyContactPhone: "0412345678",
        emergencyContactRelationship: "Mother",
      }) as Record<string, unknown>;
      expect(result.emergencyContactName).toBe("[ENCRYPTED]");
      expect(result.emergencyContactPhone).toBe("[ENCRYPTED]");
      expect(result.emergencyContactRelationship).toBe("[ENCRYPTED]");
    });

    it("redacts bank account details", () => {
      const result = redactEncryptedFields({
        bankAccountNumber: "123456789",
        bsb: "063-000",
        accountName: "John Smith",
      }) as Record<string, unknown>;
      expect(result.bankAccountNumber).toBe("[ENCRYPTED]");
      expect(result.bsb).toBe("[ENCRYPTED]");
      expect(result.accountName).toBe("[ENCRYPTED]");
    });
  });

  // -------------------------------------------------------------------------
  // Auth credential redaction
  // -------------------------------------------------------------------------
  describe("auth credential redaction", () => {
    it("redacts access tokens", () => {
      const result = redactEncryptedFields({
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      }) as Record<string, unknown>;
      expect(result.accessToken).toBe("[ENCRYPTED]");
    });

    it("redacts refresh tokens", () => {
      const result = redactEncryptedFields({
        refreshToken: "refresh_abc123_xyz789",
      }) as Record<string, unknown>;
      expect(result.refreshToken).toBe("[ENCRYPTED]");
    });

    it("redacts MFA secrets and backup codes", () => {
      const result = redactEncryptedFields({
        mfaSecret: "JBSWY3DPEHPK3PXP",
        mfaBackupCodes: ["code1", "code2", "code3"],
      }) as Record<string, unknown>;
      expect(result.mfaSecret).toBe("[ENCRYPTED]");
      expect(result.mfaBackupCodes).toBe("[ENCRYPTED]");
    });

    it("redacts worker screening numbers", () => {
      const result = redactEncryptedFields({
        policeCheckNumber: "PC-2026-001",
        ndisWorkerScreeningNumber: "NDIS-WS-12345",
        wwcNumber: "WWC-001",
      }) as Record<string, unknown>;
      expect(result.policeCheckNumber).toBe("[ENCRYPTED]");
      expect(result.ndisWorkerScreeningNumber).toBe("[ENCRYPTED]");
      expect(result.wwcNumber).toBe("[ENCRYPTED]");
    });
  });

  // -------------------------------------------------------------------------
  // Webhook PII redaction (broader set)
  // -------------------------------------------------------------------------
  describe("webhook PII redaction (APP compliance)", () => {
    it("redacts all personal identifiers in webhook payloads", () => {
      const webhookPayload = {
        event: "participant.updated",
        timestamp: "2026-02-15T10:00:00Z",
        data: {
          id: "participant_123",
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          phone: "0412345678",
          mobile: "0412345678",
          address: "123 Main St, Sydney NSW 2000",
          streetAddress: "123 Main St",
          ndisNumber: "430123456",
          dateOfBirth: "1985-03-15",
          dob: "1985-03-15",
          status: "active",
          organizationId: "org_456",
        },
      };

      const result = redactPII(webhookPayload) as Record<string, unknown>;
      const data = result.data as Record<string, unknown>;

      // PII fields should be redacted
      expect(data.firstName).toBe("[REDACTED]");
      expect(data.lastName).toBe("[REDACTED]");
      expect(data.email).toBe("[REDACTED]");
      expect(data.phone).toBe("[REDACTED]");
      expect(data.mobile).toBe("[REDACTED]");
      expect(data.address).toBe("[REDACTED]");
      expect(data.streetAddress).toBe("[REDACTED]");
      expect(data.ndisNumber).toBe("[REDACTED]");
      expect(data.dateOfBirth).toBe("[REDACTED]");
      expect(data.dob).toBe("[REDACTED]");

      // Non-PII fields should be preserved
      expect(data.id).toBe("participant_123");
      expect(data.status).toBe("active");
      expect(data.organizationId).toBe("org_456");
      expect(result.event).toBe("participant.updated");
    });

    it("handles name and fullName fields", () => {
      const result = redactPII({
        name: "John Smith",
        fullName: "John Michael Smith",
        bankAccount: "123-456-789",
      }) as Record<string, unknown>;

      expect(result.name).toBe("[REDACTED]");
      expect(result.fullName).toBe("[REDACTED]");
      expect(result.bankAccount).toBe("[REDACTED]");
    });
  });

  // -------------------------------------------------------------------------
  // Nested and complex structures
  // -------------------------------------------------------------------------
  describe("nested structure handling", () => {
    it("redacts PII in deeply nested objects", () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              email: "deep@example.com",
              status: "active",
            },
          },
        },
      };

      const result = redactPII(deepObject) as Record<string, unknown>;
      const l3 = ((result.level1 as Record<string, unknown>).level2 as Record<string, unknown>).level3 as Record<string, unknown>;
      expect(l3.email).toBe("[REDACTED]");
      expect(l3.status).toBe("active");
    });

    it("redacts PII in arrays of objects", () => {
      const arrayData = {
        participants: [
          { firstName: "Alice", status: "active" },
          { firstName: "Bob", status: "inactive" },
        ],
      };

      const result = redactPII(arrayData) as Record<string, unknown>;
      const participants = result.participants as Record<string, unknown>[];
      expect(participants[0].firstName).toBe("[REDACTED]");
      expect(participants[0].status).toBe("active");
      expect(participants[1].firstName).toBe("[REDACTED]");
    });
  });

  // -------------------------------------------------------------------------
  // JSON string handling (audit log serialization)
  // -------------------------------------------------------------------------
  describe("JSON string handling", () => {
    it("redacts fields in JSON strings (audit log format)", () => {
      const jsonStr = JSON.stringify({
        action: "update",
        entity: "participant",
        changes: {
          email: "old@example.com",
          ndisNumber: "430123456",
          status: "active",
        },
      });

      const result = redactEncryptedFields(jsonStr) as string;
      const parsed = JSON.parse(result);
      expect(parsed.changes.ndisNumber).toBe("[ENCRYPTED]");
      expect(parsed.changes.status).toBe("active");
    });

    it("handles malformed JSON gracefully", () => {
      const malformed = "{not valid json}}}";
      const result = redactEncryptedFields(malformed);
      expect(result).toBe(malformed); // Returns unchanged
    });
  });
});
