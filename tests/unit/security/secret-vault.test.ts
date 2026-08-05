import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/security/secret-vault";

const ORIGINAL_IMAGE = process.env.IMAGE_ENCRYPTION_KEY;
const ORIGINAL_SESSION = process.env.SESSION_SECRET;

afterEach(() => {
  if (ORIGINAL_IMAGE === undefined) delete process.env.IMAGE_ENCRYPTION_KEY;
  else process.env.IMAGE_ENCRYPTION_KEY = ORIGINAL_IMAGE;
  if (ORIGINAL_SESSION === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SESSION;
});

describe("secret vault", () => {
  it("encrypts and decrypts round-trip", () => {
    process.env.IMAGE_ENCRYPTION_KEY = "vault-primary-key-for-tests-32chars!!";
    delete process.env.SESSION_SECRET;
    const plain = "AIzaSyTestSecretKey123456";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("still decrypts secrets encrypted with SESSION_SECRET after IMAGE_ENCRYPTION_KEY is added", () => {
    delete process.env.IMAGE_ENCRYPTION_KEY;
    process.env.SESSION_SECRET = "legacy-session-secret-used-for-vault!!";
    const encrypted = encryptSecret("contabo-demo-key");

    // New env: IMAGE_ENCRYPTION_KEY takes precedence for writes, but decrypt
    // must still unlock the legacy ciphertext.
    process.env.IMAGE_ENCRYPTION_KEY = "brand-new-image-encryption-key-XXXX";
    process.env.SESSION_SECRET = "legacy-session-secret-used-for-vault!!";
    expect(decryptSecret(encrypted)).toBe("contabo-demo-key");
  });

  it("masks secrets for admin UI", () => {
    expect(maskSecret("AIzaSyABCDEFGHIJKLMNOP")).toMatch(/^AIza••••/);
  });
});
