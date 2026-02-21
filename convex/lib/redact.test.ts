import { describe, it, expect } from "vitest";
import { redactEncryptedFields, redactPII } from "./redact";

// ---------------------------------------------------------------------------
// redactEncryptedFields
// ---------------------------------------------------------------------------
describe("redactEncryptedFields", () => {
  it("redacts known encrypted field names", () => {
    const obj = {
      name: "John Smith",
      ndisNumber: "NDIS-12345678",
      dateOfBirth: "1990-01-15",
      bankAccountNumber: "123456789",
    };

    const result = redactEncryptedFields(obj) as Record<string, unknown>;
    expect(result.name).toBe("John Smith"); // Not in encrypted fields set
    expect(result.ndisNumber).toBe("[ENCRYPTED]");
    expect(result.dateOfBirth).toBe("[ENCRYPTED]");
    expect(result.bankAccountNumber).toBe("[ENCRYPTED]");
  });

  it("handles nested objects", () => {
    const obj = {
      participant: {
        name: "Jane Doe",
        ndisNumber: "NDIS-87654321",
        emergency: {
          emergencyContactName: "Bob Smith",
          emergencyContactPhone: "0412345678",
        },
      },
    };

    const result = redactEncryptedFields(obj) as Record<string, unknown>;
    const participant = result.participant as Record<string, unknown>;
    expect(participant.name).toBe("Jane Doe");
    expect(participant.ndisNumber).toBe("[ENCRYPTED]");

    const emergency = participant.emergency as Record<string, unknown>;
    expect(emergency.emergencyContactName).toBe("[ENCRYPTED]");
    expect(emergency.emergencyContactPhone).toBe("[ENCRYPTED]");
  });

  it("handles arrays", () => {
    const obj = {
      participants: [
        { name: "Alice", ndisNumber: "NDIS-001" },
        { name: "Bob", ndisNumber: "NDIS-002" },
      ],
    };

    const result = redactEncryptedFields(obj) as Record<string, unknown>;
    const participants = result.participants as Record<string, unknown>[];
    expect(participants[0].name).toBe("Alice");
    expect(participants[0].ndisNumber).toBe("[ENCRYPTED]");
    expect(participants[1].ndisNumber).toBe("[ENCRYPTED]");
  });

  it("handles JSON string input", () => {
    const json = JSON.stringify({
      ndisNumber: "NDIS-12345678",
      name: "Test",
    });

    const result = redactEncryptedFields(json) as string;
    const parsed = JSON.parse(result);
    expect(parsed.ndisNumber).toBe("[ENCRYPTED]");
    expect(parsed.name).toBe("Test");
  });

  it("returns invalid JSON strings unchanged", () => {
    const invalidJson = "not json {{{";
    expect(redactEncryptedFields(invalidJson)).toBe(invalidJson);
  });

  it("handles null and undefined values", () => {
    expect(redactEncryptedFields(null)).toBeNull();
    expect(redactEncryptedFields(undefined)).toBeUndefined();
  });

  it("does not redact null/undefined field values", () => {
    const obj = {
      ndisNumber: null,
      dateOfBirth: undefined,
    };
    const result = redactEncryptedFields(obj) as Record<string, unknown>;
    expect(result.ndisNumber).toBeNull();
    expect(result.dateOfBirth).toBeUndefined();
  });

  it("redacts MFA-related fields", () => {
    const obj = {
      mfaSecret: "JBSWY3DPEHPK3PXP",
      mfaBackupCodes: ["code1", "code2"],
      accessToken: "eyJ...",
      refreshToken: "refresh_abc123",
    };

    const result = redactEncryptedFields(obj) as Record<string, unknown>;
    expect(result.mfaSecret).toBe("[ENCRYPTED]");
    expect(result.mfaBackupCodes).toBe("[ENCRYPTED]");
    expect(result.accessToken).toBe("[ENCRYPTED]");
    expect(result.refreshToken).toBe("[ENCRYPTED]");
  });
});

// ---------------------------------------------------------------------------
// redactPII
// ---------------------------------------------------------------------------
describe("redactPII", () => {
  it("redacts PII fields (superset of encrypted fields)", () => {
    const obj = {
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "0412345678",
      ndisNumber: "NDIS-12345678",
      status: "active",
    };

    const result = redactPII(obj) as Record<string, unknown>;
    expect(result.firstName).toBe("[REDACTED]");
    expect(result.lastName).toBe("[REDACTED]");
    expect(result.email).toBe("[REDACTED]");
    expect(result.phone).toBe("[REDACTED]");
    expect(result.ndisNumber).toBe("[REDACTED]");
    expect(result.status).toBe("active"); // Not PII
  });

  it("redacts address fields", () => {
    const obj = {
      address: "123 Main St",
      streetAddress: "456 High Rd",
      suburb: "Sydney", // Not in PII set
    };

    const result = redactPII(obj) as Record<string, unknown>;
    expect(result.address).toBe("[REDACTED]");
    expect(result.streetAddress).toBe("[REDACTED]");
    expect(result.suburb).toBe("Sydney");
  });

  it("redacts name field", () => {
    const obj = {
      name: "Jane Doe",
      fullName: "Jane Rebecca Doe",
    };

    const result = redactPII(obj) as Record<string, unknown>;
    expect(result.name).toBe("[REDACTED]");
    expect(result.fullName).toBe("[REDACTED]");
  });

  it("handles JSON string input", () => {
    const json = JSON.stringify({
      email: "test@example.com",
      status: "active",
    });

    const result = redactPII(json) as string;
    const parsed = JSON.parse(result);
    expect(parsed.email).toBe("[REDACTED]");
    expect(parsed.status).toBe("active");
  });

  it("handles nested PII in webhook payloads", () => {
    const webhook = {
      event: "participant.created",
      data: {
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        organizationId: "org_123",
      },
    };

    const result = redactPII(webhook) as Record<string, unknown>;
    const data = (result.data) as Record<string, unknown>;
    expect(data.firstName).toBe("[REDACTED]");
    expect(data.lastName).toBe("[REDACTED]");
    expect(data.email).toBe("[REDACTED]");
    expect(data.organizationId).toBe("org_123");
    expect(result.event).toBe("participant.created");
  });

  it("preserves non-sensitive fields", () => {
    const obj = {
      id: "participant_123",
      status: "active",
      createdAt: "2026-01-01",
      organizationId: "org_456",
    };

    const result = redactPII(obj) as Record<string, unknown>;
    expect(result.id).toBe("participant_123");
    expect(result.status).toBe("active");
    expect(result.createdAt).toBe("2026-01-01");
    expect(result.organizationId).toBe("org_456");
  });
});
