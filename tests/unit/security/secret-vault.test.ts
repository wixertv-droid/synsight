import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/security/secret-vault";

describe("secret vault", () => {
  it("encrypts and decrypts round-trip", () => {
    const plain = "AIzaSyTestSecretKey123456";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toContain(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("masks secrets for admin UI", () => {
    expect(maskSecret("AIzaSyABCDEFGHIJKLMNOP")).toMatch(/^AIza••••/);
  });
});
