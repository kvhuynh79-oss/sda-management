/**
 * Field-Level Encryption Module (ENC-1)
 * AES-256-GCM encryption via Web Crypto API for NDIS-compliant data protection.
 * HMAC-SHA256 blind indexes for searchable encrypted fields.
 * ZERO Node.js imports - Web standard APIs only.
 */

const IV_LENGTH = 12; // 96-bit IV for AES-GCM (NIST recommended)
const ENCRYPTED_PREFIX = "enc:";

// Cached CryptoKey instances (module-scoped for performance)
let _encryptionKey: CryptoKey | null = null;
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
 * Import AES-256-GCM key from ENCRYPTION_KEY env var.
 * Cached after first import for performance.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (_encryptionKey) return _encryptionKey;

  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  const keyBytes = base64ToUint8Array(keyBase64);
  if (keyBytes.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (256 bits), got ${keyBytes.length}`
    );
  }

  _encryptionKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  return _encryptionKey;
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
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns null if input is null/undefined.
 * Output format: "enc:" + base64(IV[12] + ciphertext + authTag[16])
 */
export async function encryptField(
  plaintext: string | null | undefined
): Promise<string | null> {
  if (plaintext === null || plaintext === undefined) return null;

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

  return ENCRYPTED_PREFIX + uint8ArrayToBase64(combined);
}

/**
 * Decrypt an encrypted field string.
 * Returns null if input is null/undefined.
 * Passes through unencrypted strings unchanged (migration compatibility).
 */
export async function decryptField(
  encrypted: string | null | undefined
): Promise<string | null> {
  if (encrypted === null || encrypted === undefined) return null;
  if (!isEncrypted(encrypted)) return encrypted; // Pass through plaintext

  const base64 = encrypted.slice(ENCRYPTED_PREFIX.length);
  const combined = base64ToUint8Array(base64);

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const key = await getEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
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
