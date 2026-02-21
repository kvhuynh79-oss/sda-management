/**
 * Field-Level Encryption Module (ENC-1) with Key Versioning (S3)
 * AES-256-GCM encryption via Web Crypto API for NDIS-compliant data protection.
 * HMAC-SHA256 blind indexes for searchable encrypted fields.
 * ZERO Node.js imports - Web standard APIs only.
 *
 * KEY VERSIONING (S3 - Critical):
 * ──────────────────────────────────────────────────────────────────────────────
 * Encrypted values now include a key version prefix for rotation support.
 *
 * Format: "enc:<version>:<base64(IV + ciphertext + authTag)>"
 *   - version: "v1", "v2", etc.
 *   - Legacy format (no version): "enc:<base64(...)>" — treated as v1
 *
 * Environment variables:
 *   ENCRYPTION_KEY      — Original key, always treated as v1
 *   ENCRYPTION_KEY_V2   — Rotation key (set when rotating)
 *   ENCRYPTION_KEY_V3   — Future rotation key
 *   CURRENT_KEY_VERSION — Which version to use for new encryptions (default: "v1")
 *
 * Decryption tries the version indicated in the prefix first, then falls back
 * to all known keys. This ensures data encrypted with ANY version can be read
 * during and after rotation.
 *
 * ROTATION PROCEDURE:
 * ──────────────────────────────────────────────────────────────────────────────
 * 1. Generate new 256-bit key:
 *    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * 2. Set the new key as the NEXT version in Convex env vars:
 *    npx convex env set ENCRYPTION_KEY_V2 "<new-base64-key>"
 *
 * 3. Set the current version to the new version:
 *    npx convex env set CURRENT_KEY_VERSION "v2"
 *
 * 4. All NEW encryptions now use v2. All EXISTING data still decrypts with v1.
 *
 * 5. Run the key rotation migration to re-encrypt all data with v2:
 *    npx convex run migrations/keyRotation:rotateAllEncryptedFields
 *
 * 6. Verify migration completed (check logs for "COMPLETE" message).
 *
 * 7. Once all data is on v2, the v1 key can be retired (but keep it in a
 *    secure backup for 90 days in case of rollback).
 *
 * ROLLBACK:
 *   - Set CURRENT_KEY_VERSION back to "v1"
 *   - Both keys remain active for decryption, so no data loss
 *   - Run migration again if needed to re-encrypt back to v1
 *
 * KEY BACKUP:
 *   - Store encryption keys in 1Password vault or AWS Secrets Manager
 *   - Never commit keys to source control
 *   - Convex env vars are encrypted at rest by Convex infrastructure
 *   - Maintain a key registry document listing: version, creation date,
 *     status (active/deprecated/retired), and vault location
 *
 * PER-ORGANISATION KEYS (FUTURE DESIGN):
 * ──────────────────────────────────────────────────────────────────────────────
 * For maximum isolation, each organisation could have its own encryption key.
 * Design:
 *   - Table: organisationKeys { orgId, keyVersion, encryptedKey, createdAt, status }
 *   - The `encryptedKey` field is the org key encrypted with the master key
 *   - Encrypt: masterDecrypt(orgKey) → use orgKey to encrypt field
 *   - Decrypt: masterDecrypt(orgKey) → use orgKey to decrypt field
 *   - Rotation: generate new orgKey, re-encrypt all org data, update version
 *   - Impact: Requires modifying every encrypt/decrypt call to pass orgId
 *   - Recommendation: Implement when onboarding enterprise clients with
 *     contractual key isolation requirements (not needed for current scale)
 */

const IV_LENGTH = 12; // 96-bit IV for AES-GCM (NIST recommended)
const ENCRYPTED_PREFIX = "enc:";
const VERSION_PREFIX_REGEX = /^v(\d+):(.+)$/; // Matches "v1:base64data..."
const DEFAULT_KEY_VERSION = "v1";

// Cached CryptoKey instances per version (module-scoped for performance)
const _encryptionKeys: Map<string, CryptoKey> = new Map();
let _hmacKey: CryptoKey | null = null;

/** Convert Uint8Array to base64 (safe for large arrays - no spread operator) */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert base64 string to Uint8Array */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get the current key version to use for new encryptions.
 * Reads from CURRENT_KEY_VERSION env var, defaults to "v1".
 */
function getCurrentKeyVersion(): string {
  return process.env.CURRENT_KEY_VERSION || DEFAULT_KEY_VERSION;
}

/**
 * Get the environment variable name for a given key version.
 * v1 → ENCRYPTION_KEY (backward compatible)
 * v2 → ENCRYPTION_KEY_V2
 * v3 → ENCRYPTION_KEY_V3, etc.
 */
function getKeyEnvVarName(version: string): string {
  if (version === "v1") return "ENCRYPTION_KEY";
  return `ENCRYPTION_KEY_${version.toUpperCase()}`;
}

/**
 * Import AES-256-GCM key for a specific version.
 * Cached per version after first import for performance.
 */
async function getEncryptionKeyForVersion(version: string): Promise<CryptoKey | null> {
  const cached = _encryptionKeys.get(version);
  if (cached) return cached;

  const envVarName = getKeyEnvVarName(version);
  const keyBase64 = process.env[envVarName];
  if (!keyBase64) {
    return null; // Key not configured for this version
  }

  const keyBytes = base64ToUint8Array(keyBase64);
  if (keyBytes.length !== 32) {
    throw new Error(
      `${envVarName} must be 32 bytes (256 bits), got ${keyBytes.length}`
    );
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  _encryptionKeys.set(version, key);
  return key;
}

/**
 * Import AES-256-GCM key for the CURRENT version (used for encryption).
 * Throws if the current version key is not configured.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const version = getCurrentKeyVersion();
  const key = await getEncryptionKeyForVersion(version);
  if (!key) {
    throw new Error(
      `Encryption key not configured for current version ${version}. ` +
      `Set ${getKeyEnvVarName(version)} environment variable.`
    );
  }
  return key;
}

/**
 * Get all configured key versions for decryption fallback.
 * Checks v1 through v9 (supports up to 9 rotation cycles).
 */
function getAvailableKeyVersions(): string[] {
  const versions: string[] = [];
  // Always check v1 (ENCRYPTION_KEY)
  if (process.env.ENCRYPTION_KEY) versions.push("v1");
  // Check v2 through v9
  for (let i = 2; i <= 9; i++) {
    const envVar = `ENCRYPTION_KEY_V${i}`;
    if (process.env[envVar]) versions.push(`v${i}`);
  }
  return versions;
}

/**
 * Import HMAC-SHA256 key from HMAC_KEY env var.
 * Used for blind index generation. Cached after first import.
 */
async function getHmacKey(): Promise<CryptoKey> {
  if (_hmacKey) return _hmacKey;

  const keyBase64 = process.env.HMAC_KEY;
  if (!keyBase64) {
    throw new Error("HMAC_KEY environment variable is not set");
  }

  const keyBytes = base64ToUint8Array(keyBase64);

  _hmacKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return _hmacKey;
}

/**
 * Parse an encrypted value to extract version and payload.
 * Returns { version, payload } where payload is the base64 data.
 *
 * Handles three formats:
 * 1. "enc:v1:<base64>"   → version "v1", payload "<base64>"
 * 2. "enc:<base64>"      → version "v1" (legacy, no version prefix)
 * 3. Not encrypted        → null
 */
function parseEncryptedValue(value: string): { version: string; payload: string } | null {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return null;

  const afterPrefix = value.slice(ENCRYPTED_PREFIX.length);
  const versionMatch = afterPrefix.match(VERSION_PREFIX_REGEX);

  if (versionMatch) {
    // Format: "enc:v1:<base64>" — versioned
    return {
      version: `v${versionMatch[1]}`,
      payload: versionMatch[2],
    };
  }

  // Format: "enc:<base64>" — legacy (treat as v1)
  return {
    version: "v1",
    payload: afterPrefix,
  };
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns null if input is null/undefined.
 * Output format: "enc:<version>:<base64(IV[12] + ciphertext + authTag[16])>"
 */
export async function encryptField(
  plaintext: string | null | undefined
): Promise<string | null> {
  if (plaintext === null || plaintext === undefined) return null;

  const version = getCurrentKeyVersion();
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  // Concatenate IV + encrypted (which includes ciphertext + auth tag)
  const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), IV_LENGTH);

  return `${ENCRYPTED_PREFIX}${version}:${uint8ArrayToBase64(combined)}`;
}

/**
 * Decrypt an encrypted field string.
 * Returns null if input is null/undefined.
 * Passes through unencrypted strings unchanged (migration compatibility).
 *
 * Decryption strategy:
 * 1. Parse the version prefix from the encrypted value
 * 2. Try the indicated version key first
 * 3. If that fails, try all other available keys (for mis-tagged data)
 * 4. If all keys fail, return "[encrypted]" placeholder
 */
export async function decryptField(
  encrypted: string | null | undefined
): Promise<string | null> {
  if (encrypted === null || encrypted === undefined) return null;
  if (!isEncrypted(encrypted)) return encrypted; // Pass through plaintext

  const parsed = parseEncryptedValue(encrypted);
  if (!parsed) return encrypted; // Should not happen if isEncrypted passed

  const { version, payload } = parsed;

  try {
    const combined = base64ToUint8Array(payload);
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    // Try the indicated version first
    const primaryKey = await getEncryptionKeyForVersion(version);
    if (primaryKey) {
      try {
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          primaryKey,
          ciphertext
        );
        return new TextDecoder().decode(decrypted);
      } catch {
        // Primary key failed, try fallback keys below
      }
    }

    // Fallback: try all other available keys
    const allVersions = getAvailableKeyVersions();
    for (const fallbackVersion of allVersions) {
      if (fallbackVersion === version) continue; // Already tried
      const fallbackKey = await getEncryptionKeyForVersion(fallbackVersion);
      if (!fallbackKey) continue;

      try {
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          fallbackKey,
          ciphertext
        );
        console.warn(
          `[ENC] Decrypted with fallback key ${fallbackVersion} (tagged as ${version})`
        );
        return new TextDecoder().decode(decrypted);
      } catch {
        // This key also failed, try next
      }
    }

    // All keys failed
    console.warn("[ENC] Decryption failed for a field (no matching key found)");
    return "[encrypted]";
  } catch {
    // Key mismatch or corrupt data - return placeholder instead of crashing
    console.warn("[ENC] Decryption failed for a field (key mismatch or corrupt data)");
    return "[encrypted]";
  }
}

/**
 * Create a blind index for searchable encrypted fields.
 * Uses HMAC-SHA256, returns first 16 hex characters.
 * Normalizes input (lowercase, trimmed) before hashing.
 * Returns null if input is null/undefined.
 */
export async function createBlindIndex(
  value: string | null | undefined
): Promise<string | null> {
  if (value === null || value === undefined) return null;

  const key = await getHmacKey();
  const normalized = value.toLowerCase().trim();
  const encoded = new TextEncoder().encode(normalized);

  const signature = await crypto.subtle.sign("HMAC", key, encoded);
  const hashArray = new Uint8Array(signature);

  // Return first 8 bytes as 16 hex characters
  return Array.from(hashArray.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Check if a value is already encrypted (has "enc:" prefix).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Get the key version of an encrypted value.
 * Returns the version string (e.g., "v1", "v2") or null if not encrypted.
 */
export function getEncryptedKeyVersion(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = parseEncryptedValue(value);
  return parsed ? parsed.version : null;
}

/**
 * Check if an encrypted value is using the current key version.
 * Returns true if the value is encrypted with the current version.
 * Used by key rotation migration to skip already-rotated records.
 */
export function isCurrentKeyVersion(value: string | null | undefined): boolean {
  if (!value) return false;
  const version = getEncryptedKeyVersion(value);
  return version === getCurrentKeyVersion();
}

/**
 * Re-encrypt a value with the current key version.
 * Decrypts with whatever key was used, then encrypts with current version.
 * Returns null if input is null/undefined.
 * Returns the value unchanged if it's already on the current version.
 */
export async function reEncryptWithCurrentKey(
  encrypted: string | null | undefined
): Promise<string | null> {
  if (encrypted === null || encrypted === undefined) return null;
  if (!isEncrypted(encrypted)) return encrypted; // Not encrypted, pass through

  // Skip if already on current version
  if (isCurrentKeyVersion(encrypted)) return encrypted;

  // Decrypt with whatever key works
  const plaintext = await decryptField(encrypted);
  if (plaintext === null || plaintext === "[encrypted]") {
    // Cannot decrypt — cannot re-encrypt
    console.warn("[ENC] Cannot re-encrypt: decryption failed");
    return encrypted; // Return as-is rather than corrupting
  }

  // Re-encrypt with current key
  return encryptField(plaintext);
}

/**
 * Clear the cached encryption keys (useful for testing or after env var changes).
 */
export function clearKeyCache(): void {
  _encryptionKeys.clear();
  _hmacKey = null;
}
