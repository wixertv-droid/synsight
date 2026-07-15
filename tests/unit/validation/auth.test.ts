import { describe, expect, it } from "vitest";
import {
  loginSchema,
  passwordSchema,
  registerSchema,
  resendVerificationSchema,
  verificationTokenSchema,
} from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("accepts a valid identifier and password", () => {
    const result = loginSchema.safeParse({
      identifier: "admin",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty identifier and password", () => {
    const result = loginSchema.safeParse({
      identifier: "  ",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("SecurePass1!").success).toBe(true);
  });

  it("rejects short or weak passwords", () => {
    expect(passwordSchema.safeParse("short1!A").success).toBe(false);
    expect(passwordSchema.safeParse("nouppercase1!").success).toBe(false);
    expect(passwordSchema.safeParse("NOLOWERCASE1!").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigits!!!!").success).toBe(false);
    expect(passwordSchema.safeParse("NoSpecial1234").success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex@example.com",
    password: "SecurePass1!",
    passwordConfirm: "SecurePass1!",
    monitoringOptIn: true,
  };

  it("accepts a complete registration payload", () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("alex@example.com");
    }
  });

  it("rejects mismatched password confirmation", () => {
    const result = registerSchema.safeParse({
      ...valid,
      passwordConfirm: "DifferentPass1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email addresses", () => {
    expect(
      registerSchema.safeParse({ ...valid, email: "not-an-email" }).success
    ).toBe(false);
  });
});

describe("verification schemas", () => {
  it("requires a long verification token", () => {
    expect(verificationTokenSchema.safeParse({ token: "short" }).success).toBe(
      false
    );
    expect(
      verificationTokenSchema.safeParse({
        token: "a".repeat(32),
      }).success
    ).toBe(true);
  });

  it("validates resend email input", () => {
    expect(
      resendVerificationSchema.safeParse({ email: "user@synsight.de" }).success
    ).toBe(true);
    expect(resendVerificationSchema.safeParse({ email: "bad" }).success).toBe(
      false
    );
  });
});
