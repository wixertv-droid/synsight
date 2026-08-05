import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Vault key material candidates.
 * Prefer IMAGE_ENCRYPTION_KEY for new writes, but decrypt must also try
 * SESSION_SECRET — secrets were historically encrypted with whichever
 * env var was present first. Changing only one of them must not brick
 * existing api_credentials rows.
 */
function vaultKeyMaterials(): string[] {
  const keys: string[] = [];
  const image = process.env.IMAGE_ENCRYPTION_KEY?.trim();
  const session = process.env.SESSION_SECRET?.trim();
  if (image) keys.push(image);
  if (session && session !== image) keys.push(session);
  if (keys.length === 0) {
    keys.push("development-only-insecure-secret-change-me");
  }
  return keys;
}

function hashMaterial(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/** Primary key used for NEW encryption (stable preference). */
function getVaultKey(): Buffer {
  return hashMaterial(vaultKeyMaterials()[0]!);
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getVaultKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptWithKey(payload: string, key: Buffer): string {
  const buffer = Buffer.from(payload, "base64");
  if (buffer.length < 28) {
    throw new Error("Unsupported state or unable to authenticate data");
  }
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}

/**
 * Decrypt a vault payload. Tries IMAGE_ENCRYPTION_KEY then SESSION_SECRET
 * so production keys remain readable after env reordering.
 */
export function decryptSecret(payload: string): string {
  const materials = vaultKeyMaterials();
  let lastError: unknown;
  for (const material of materials) {
    try {
      return decryptWithKey(payload, hashMaterial(material));
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("Unsupported state or unable to authenticate data");
}

export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
