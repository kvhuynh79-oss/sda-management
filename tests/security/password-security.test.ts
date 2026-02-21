import { describe, it, expect } from "vitest";
import {
  validatePasswordComplexity,
  requirePasswordComplexity,
} from "../../convex/lib/passwordValidation";

/**
 * Security Tests: Password Security
 *
 * Verifies that password validation enforces OWASP-compliant
 * complexity requirements and rejects weak/common passwords.
 */

describe("Password Security Enforcement", () => {
  // -------------------------------------------------------------------------
  // Common weak passwords
  // -------------------------------------------------------------------------
  describe("rejects common weak passwords", () => {
    const weakPasswords = [
      "password",
      "Password1",
      "12345678",
      "qwerty",
      "abc123",
      "letmein",
      "welcome",
      "admin",
      "monkey",
      "master",
      "dragon",
      "login",
      "princess",
      "football",
      "shadow",
    ];

    for (const pwd of weakPasswords) {
      it(`rejects "${pwd}"`, () => {
        const result = validatePasswordComplexity(pwd);
        expect(result.valid).toBe(false);
      });
    }
  });

  // -------------------------------------------------------------------------
  // Minimum length enforcement
  // -------------------------------------------------------------------------
  describe("minimum length enforcement (OWASP: 12+)", () => {
    it("rejects 8-character password (common weak minimum)", () => {
      const result = validatePasswordComplexity("Abcd123!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("12 characters"))).toBe(true);
    });

    it("rejects 11-character password", () => {
      const result = validatePasswordComplexity("Abcdefgh12!");
      expect(result.valid).toBe(false);
    });

    it("accepts 12-character password with all classes", () => {
      const result = validatePasswordComplexity("Abcdefgh123!");
      expect(result.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Maximum length enforcement (DoS prevention)
  // -------------------------------------------------------------------------
  describe("maximum length enforcement (DoS prevention)", () => {
    it("rejects passwords over 128 characters", () => {
      const result = validatePasswordComplexity("Aa1!" + "x".repeat(126));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("128 characters"))).toBe(true);
    });

    it("accepts password at exactly 128 characters", () => {
      const result = validatePasswordComplexity("Aa1!" + "x".repeat(124));
      expect(result.valid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Character class requirements
  // -------------------------------------------------------------------------
  describe("character class requirements", () => {
    it("requires uppercase letter", () => {
      const result = validatePasswordComplexity("securepass123!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("uppercase"))).toBe(true);
    });

    it("requires lowercase letter", () => {
      const result = validatePasswordComplexity("SECUREPASS123!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
    });

    it("requires digit", () => {
      const result = validatePasswordComplexity("SecurePassword!");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("digit"))).toBe(true);
    });

    it("requires special character", () => {
      const result = validatePasswordComplexity("SecurePass1234");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("special character"))).toBe(
        true
      );
    });
  });

  // -------------------------------------------------------------------------
  // requirePasswordComplexity (server-side enforcement)
  // -------------------------------------------------------------------------
  describe("server-side enforcement via requirePasswordComplexity", () => {
    it("throws on invalid password (prevents storage of weak passwords)", () => {
      expect(() => requirePasswordComplexity("weak")).toThrow();
    });

    it("does not throw on valid password", () => {
      expect(() =>
        requirePasswordComplexity("SecurePass123!")
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Input edge cases (security perspective)
  // -------------------------------------------------------------------------
  describe("input edge cases", () => {
    it("handles null input without crashing", () => {
      const result = validatePasswordComplexity(
        null as unknown as string
      );
      expect(result.valid).toBe(false);
    });

    it("handles undefined input without crashing", () => {
      const result = validatePasswordComplexity(
        undefined as unknown as string
      );
      expect(result.valid).toBe(false);
    });

    it("handles empty string", () => {
      const result = validatePasswordComplexity("");
      expect(result.valid).toBe(false);
    });

    it("handles string with only whitespace", () => {
      const result = validatePasswordComplexity("            ");
      expect(result.valid).toBe(false);
    });
  });
});
