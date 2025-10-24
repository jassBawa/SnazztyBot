import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set in environment and be at least 32 characters");
  }
  return key;
}

function deriveKey(salt: Buffer): Buffer {
  const masterKey = getEncryptionKey();
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, "sha256");
}

export function encrypt(data: string | Buffer | Uint8Array): string {
  const text = typeof data === "string" ? data : Buffer.from(data).toString("hex");

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts data encrypted with the encrypt function
 * @param encryptedData - Base64 encoded encrypted data
 * @returns The original decrypted string
 */
export function decrypt(encryptedData: string): string {
  // Decode from base64
  const combined = Buffer.from(encryptedData, "base64");

  // Extract parts
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Derive key from master key
  const key = deriveKey(salt);

  // Create decipher and decrypt
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function encryptSecretKey(secretKey: Uint8Array): string {
  return encrypt(secretKey);
}

export function decryptSecretKey(encryptedKey: string): Uint8Array {
  const decrypted = decrypt(encryptedKey);
  // Convert hex string back to Uint8Array
  const bytes = Buffer.from(decrypted, "hex");
  return new Uint8Array(bytes);
}
