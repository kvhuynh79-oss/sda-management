import { describe, it, expect } from "vitest";
import {
  validatePasswordComplexity,
  requirePasswordComplexity,
} from "./passwordValidation";

describe("validatePasswordComplexity", () => {
  // -------------------------------------------------------------------------
  // Valid passwords
  // -------------------------------------------------------------------------
  describe("valid passwords", () => {
    it("accepts a password meeting all requirements", () => {
      const result = validatePasswordComplexity("SecurePass123!");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts exactly 12 characters", () => {
      const result = validatePasswordComplexity("Abcdefgh123!");
      expect(result.valid).toBe(true);
    });

    it("accepts a 128-character password", () => {
      const longPassword = "Aa1!" + "x".repeat(124);
      const result = validatePasswordComplexity(longPassword);
      expect(result.valid).toBe(true);
    });

    it("accepts passwords with various special characters", () => {
      const specials = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+"];
      for (const char of specials) {
        const password = `SecurePass12${char}`;
        const result = validatePasswordComplexity(password);
        expect(result.valid).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Invalid passwords - too short
  // -------------------------------------------------------------------------
  describe("too short", () => {
    it("rejects password under 12 characters", () => {
      const result = validatePasswordComplexity("Short1!a");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 12 characters long."
      );
    });

    it("rejects 11-character password", () => {
      const result = validatePasswordComplexity("Abcdefgh12!");
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Invalid passwords - too long
  // -------------------------------------------------------------------------
  describe("too long", () => {
    it("rejects password over 128 characters", () => {
      const longPassword = "Aa1!" + "x".repeat(126);
      expect(longPassword.length).toBeGreaterThan(128);
      const result = validatePasswordComplexity(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be no more than 128 characters long."
      );
    });
  });

  // -------------------------------------------------------------------------
  // Missing character classes
  // -------------------------------------------------------------------------
  describe("missing character classes", () => {
    it("rejects password without uppercase", () => {
      const result = validatePasswordComplexity("securepass123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least 1 uppercase letter (A-Z)."
      );
    });

    it("rejects password without lowercase", () => {
      const result = validatePasswordComplexity("SECUREPASS123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least 1 lowercase letter (a-z)."
      );
    });

    it("rejects password without digit", () => {
      const result = validatePasswordComplexity("SecurePassWord!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least 1 digit (0-9)."
      );
    });

    it("rejects password without special character", () => {
      const result = validatePasswordComplexity("SecurePass1234");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least 1 special character (e.g. !@#$%^&*)."
      );
    });
  });

  // -------------------------------------------------------------------------
  // Multiple errors
  // -------------------------------------------------------------------------
  describe("multiple errors", () => {
    it("returns all applicable errors", () => {
      const result = validatePasswordComplexity("short");
      expect(result.valid).toBe(false);
      // Should have errors for: too short, no uppercase, no digit, no special char
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe("edge cases", () => {
    it("rejects empty string", () => {
      const result = validatePasswordComplexity("");
      expect(result.valid).toBe(false);
    });

    it("rejects null/undefined via type coercion", () => {
      // TypeScript would prevent this, but testing runtime safety
      const result = validatePasswordComplexity(null as unknown as string);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password is required.");
    });
  });
});

// ---------------------------------------------------------------------------
// requirePasswordComplexity
// ---------------------------------------------------------------------------
describe("requirePasswordComplexity", () => {
  it("does not throw for a valid password", () => {
    expect(() => requirePasswordComplexity("SecurePass123!")).not.toThrow();
  });

  it("throws for an invalid password", () => {
    expect(() => requirePasswordComplexity("weak")).toThrow(
      "Password does not meet complexity requirements"
    );
  });

  it("includes all error messages in the thrown error", () => {
    try {
      requirePasswordComplexity("weak");
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain("at least 12 characters");
      expect(message).toContain("uppercase");
      expect(message).toContain("digit");
      expect(message).toContain("special character");
    }
  });
});
