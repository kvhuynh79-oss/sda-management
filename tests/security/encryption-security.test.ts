import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  encryptField,
  decryptField,
  isEncrypted,
  clearKeyCache,
} from "../../convex/lib/encryption";

/**
 * Security Tests: Encryption Security
 *
 * Verifies encryption implementation security properties:
 * - Ciphertext does not leak plaintext
 * - Different IVs produce different ciphertext (no deterministic encryption)
 * - Wrong key cannot decrypt
 * - Null/undefined handling does not bypass encryption
 */

const TEST_KEY_BASE64 = Buffer.from(
  "0123456789abcdef0123456789abcdef"
).toString("base64");

const WRONG_KEY_BASE64 = Buffer.from(
  "fedcba9876543210fedcba9876543210"
).toString("base64");

const TEST_HMAC_KEY_BASE64 = Buffer.from(
  "hmac_test_key_0123456789abcdef00"
).toString("base64");

describe("Encryption Security Properties", () => {
  beforeEach(() => {
    clearKeyCache();
    process.env.ENCRYPTION_KEY = TEST_KEY_BASE64;
    process.env.HMAC_KEY = TEST_HMAC_KEY_BASE64;
    delete process.env.ENCRYPTION_KEY_V2;
    delete process.env.CURRENT_KEY_VERSION;
  });

  afterEach(() => {
    clearKeyCache();
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY_V2;
    delete process.env.HMAC_KEY;
    delete process.env.CURRENT_KEY_VERSION;
  });

  // -------------------------------------------------------------------------
  // Ciphertext does not leak plaintext
  // -------------------------------------------------------------------------
  describe("ciphertext opacity", () => {
    it("encrypted NDIS number does not contain the number in plaintext", async () => {
      const ndisNumber = "430123456";
      const encrypted = await encryptField(ndisNumber);
      expect(encrypted).not.toBeNull();
      expect(encrypted!).not.toContain(ndisNumber);
    });

    it("encrypted date of birth does not contain the date in plaintext", async () => {
      const dob = "1985-03-15";
      const encrypted = await encryptField(dob);
      expect(encrypted!).not.toContain("1985");
      expect(encrypted!).not.toContain("03-15");
    });

    it("encrypted bank account does not contain the account number", async () => {
      const accountNumber = "123456789";
      const encrypted = await encryptField(accountNumber);
      expect(encrypted!).not.toContain(accountNumber);
    });
  });

  // -------------------------------------------------------------------------
  // IV randomness (non-deterministic encryption)
  // -------------------------------------------------------------------------
  describe("IV randomness", () => {
    it("same plaintext produces different ciphertext each time", async () => {
      const plaintext = "NDIS-430123456";
      const results = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const encrypted = await encryptField(plaintext);
        results.add(encrypted!);
      }

      // All 5 encryptions should be unique (extremely high probability)
      expect(results.size).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // Key isolation
  // -------------------------------------------------------------------------
  describe("key isolation", () => {
    it("data encrypted with one key cannot be decrypted with another", async () => {
      const plaintext = "sensitive NDIS data";
      const encrypted = await encryptField(plaintext);

      // Switch to a different key
      clearKeyCache();
      process.env.ENCRYPTION_KEY = WRONG_KEY_BASE64;

      const result = await decryptField(encrypted);
      // Should return placeholder, not the plaintext
      expect(result).toBe("[encrypted]");
      expect(result).not.toBe(plaintext);
    });
  });

  // -------------------------------------------------------------------------
  // Null/undefined bypass prevention
  // -------------------------------------------------------------------------
  describe("null/undefined bypass prevention", () => {
    it("null input returns null (not unencrypted data)", async () => {
      const result = await encryptField(null);
      expect(result).toBeNull();
    });

    it("undefined input returns null (not unencrypted data)", async () => {
      const result = await encryptField(undefined);
      expect(result).toBeNull();
    });

    it("decrypting null returns null (no crash)", async () => {
      const result = await decryptField(null);
      expect(result).toBeNull();
    });

    it("decrypting undefined returns null (no crash)", async () => {
      const result = await decryptField(undefined);
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Encrypted value format validation
  // -------------------------------------------------------------------------
  describe("encrypted value format", () => {
    it("encrypted values have the correct prefix format", async () => {
      const encrypted = await encryptField("test");
      expect(encrypted).toMatch(/^enc:v\d+:/);
    });

    it("isEncrypted correctly identifies encrypted values", () => {
      expect(isEncrypted("enc:v1:base64data")).toBe(true);
      expect(isEncrypted("enc:v2:base64data")).toBe(true);
      expect(isEncrypted("not encrypted")).toBe(false);
      expect(isEncrypted("enc:legacy_format")).toBe(true);
    });

    it("plaintext passthrough does not encrypt non-encrypted input during decrypt", async () => {
      const plaintext = "plain text value";
      const result = await decryptField(plaintext);
      expect(result).toBe(plaintext);
    });
  });

  // -------------------------------------------------------------------------
  // Missing key handling
  // -------------------------------------------------------------------------
  describe("missing key handling", () => {
    it("throws when no encryption key is configured for current version", async () => {
      clearKeyCache();
      delete process.env.ENCRYPTION_KEY;

      await expect(encryptField("test")).rejects.toThrow(
        /Encryption key not configured/
      );
    });
  });
});
