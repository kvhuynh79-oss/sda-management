import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  encryptField,
  decryptField,
  isEncrypted,
  getEncryptedKeyVersion,
  isCurrentKeyVersion,
  clearKeyCache,
} from "./encryption";

/**
 * Encryption module tests.
 *
 * These tests use real Web Crypto API (available in Node.js 20+).
 * We mock process.env to provide test encryption keys.
 */

// Generate a test key: 32 bytes (256 bits) encoded as base64
// This is a deterministic test key - never use in production.
const TEST_KEY_V1_BASE64 = Buffer.from(
  "0123456789abcdef0123456789abcdef" // 32 bytes
).toString("base64");

const TEST_KEY_V2_BASE64 = Buffer.from(
  "fedcba9876543210fedcba9876543210" // 32 bytes
).toString("base64");

const TEST_HMAC_KEY_BASE64 = Buffer.from(
  "hmac_test_key_0123456789abcdef00" // 32 bytes
).toString("base64");

describe("encryption module", () => {
  beforeEach(() => {
    clearKeyCache();
    // Set up test encryption keys in process.env
    process.env.ENCRYPTION_KEY = TEST_KEY_V1_BASE64;
    process.env.HMAC_KEY = TEST_HMAC_KEY_BASE64;
    // Ensure v2 and CURRENT_KEY_VERSION are unset by default
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
  // isEncrypted
  // -------------------------------------------------------------------------
  describe("isEncrypted", () => {
    it("returns true for encrypted values", () => {
      expect(isEncrypted("enc:v1:somebase64data")).toBe(true);
    });

    it("returns true for legacy format without version", () => {
      expect(isEncrypted("enc:somebase64data")).toBe(true);
    });

    it("returns false for plaintext", () => {
      expect(isEncrypted("plain text value")).toBe(false);
    });

    it("returns false for null", () => {
      expect(isEncrypted(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isEncrypted(undefined)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getEncryptedKeyVersion
  // -------------------------------------------------------------------------
  describe("getEncryptedKeyVersion", () => {
    it("returns v1 for versioned v1 format", () => {
      expect(getEncryptedKeyVersion("enc:v1:data")).toBe("v1");
    });

    it("returns v2 for versioned v2 format", () => {
      expect(getEncryptedKeyVersion("enc:v2:data")).toBe("v2");
    });

    it("returns v1 for legacy format (no version)", () => {
      expect(getEncryptedKeyVersion("enc:data")).toBe("v1");
    });

    it("returns null for non-encrypted values", () => {
      expect(getEncryptedKeyVersion("plain text")).toBe(null);
    });

    it("returns null for null", () => {
      expect(getEncryptedKeyVersion(null)).toBe(null);
    });
  });

  // -------------------------------------------------------------------------
  // isCurrentKeyVersion
  // -------------------------------------------------------------------------
  describe("isCurrentKeyVersion", () => {
    it("returns true when encrypted with current version (v1 default)", () => {
      expect(isCurrentKeyVersion("enc:v1:data")).toBe(true);
    });

    it("returns false when encrypted with different version", () => {
      expect(isCurrentKeyVersion("enc:v2:data")).toBe(false);
    });

    it("returns true for legacy format (treated as v1, current is v1)", () => {
      expect(isCurrentKeyVersion("enc:data")).toBe(true);
    });

    it("returns false for null", () => {
      expect(isCurrentKeyVersion(null)).toBe(false);
    });

    it("respects CURRENT_KEY_VERSION env var", () => {
      process.env.CURRENT_KEY_VERSION = "v2";
      expect(isCurrentKeyVersion("enc:v2:data")).toBe(true);
      expect(isCurrentKeyVersion("enc:v1:data")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Encrypt / Decrypt round trip
  // -------------------------------------------------------------------------
  describe("encrypt and decrypt round trip", () => {
    it("encrypts and decrypts a simple string", async () => {
      const plaintext = "NDIS-12345678";
      const encrypted = await encryptField(plaintext);

      expect(encrypted).not.toBeNull();
      expect(encrypted).toMatch(/^enc:v1:/);
      expect(encrypted).not.toContain(plaintext);

      const decrypted = await decryptField(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("handles unicode strings", async () => {
      const plaintext = "Participant: John O'Brien-Smith";
      const encrypted = await encryptField(plaintext);
      const decrypted = await decryptField(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("handles empty string", async () => {
      const encrypted = await encryptField("");
      const decrypted = await decryptField(encrypted);
      expect(decrypted).toBe("");
    });

    it("returns null for null input", async () => {
      expect(await encryptField(null)).toBeNull();
      expect(await decryptField(null)).toBeNull();
    });

    it("returns null for undefined input", async () => {
      expect(await encryptField(undefined)).toBeNull();
      expect(await decryptField(undefined)).toBeNull();
    });

    it("produces different ciphertexts for the same plaintext (random IV)", async () => {
      const plaintext = "sensitive-data";
      const encrypted1 = await encryptField(plaintext);
      const encrypted2 = await encryptField(plaintext);

      // Different ciphertexts due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to the same value
      expect(await decryptField(encrypted1)).toBe(plaintext);
      expect(await decryptField(encrypted2)).toBe(plaintext);
    });
  });

  // -------------------------------------------------------------------------
  // Decryption with wrong key
  // -------------------------------------------------------------------------
  describe("decryption failure handling", () => {
    it("returns '[encrypted]' when no matching key is available", async () => {
      const plaintext = "test data";
      const encrypted = await encryptField(plaintext);

      // Clear cache and change the key
      clearKeyCache();
      process.env.ENCRYPTION_KEY = TEST_KEY_V2_BASE64;

      const result = await decryptField(encrypted);
      expect(result).toBe("[encrypted]");
    });

    it("passes through unencrypted strings unchanged", async () => {
      const plaintext = "not encrypted at all";
      const result = await decryptField(plaintext);
      expect(result).toBe(plaintext);
    });
  });

  // -------------------------------------------------------------------------
  // Key versioning
  // -------------------------------------------------------------------------
  describe("key versioning", () => {
    it("encrypts with current key version", async () => {
      const encrypted = await encryptField("test");
      expect(encrypted).toMatch(/^enc:v1:/);
    });

    it("encrypts with v2 when CURRENT_KEY_VERSION is set", async () => {
      process.env.ENCRYPTION_KEY_V2 = TEST_KEY_V2_BASE64;
      process.env.CURRENT_KEY_VERSION = "v2";
      clearKeyCache();

      const encrypted = await encryptField("test");
      expect(encrypted).toMatch(/^enc:v2:/);

      const decrypted = await decryptField(encrypted);
      expect(decrypted).toBe("test");
    });

    it("decrypts v1 data after rotating to v2", async () => {
      // Encrypt with v1
      const encrypted = await encryptField("sensitive");
      expect(encrypted).toMatch(/^enc:v1:/);

      // Now rotate to v2
      process.env.ENCRYPTION_KEY_V2 = TEST_KEY_V2_BASE64;
      process.env.CURRENT_KEY_VERSION = "v2";
      clearKeyCache();

      // v1 data should still decrypt (v1 key still available)
      const decrypted = await decryptField(encrypted);
      expect(decrypted).toBe("sensitive");
    });
  });
});
