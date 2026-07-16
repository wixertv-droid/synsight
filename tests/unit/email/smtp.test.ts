import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "@/lib/config/env";

const { sendMail, createTransport, close } = vi.hoisted(() => {
  const hoistedSendMail = vi.fn();
  const hoistedClose = vi.fn();
  return {
    sendMail: hoistedSendMail,
    close: hoistedClose,
    createTransport: vi.fn(() => ({
      sendMail: hoistedSendMail,
      close: hoistedClose,
    })),
  };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { sendVerificationEmail } from "@/lib/email/smtp";

const env = {
  NODE_ENV: "production",
  REQUIRE_DATABASE: "true",
  DATABASE_URL: "mysql://user:password@localhost:3306/synsight",
  APP_URL: "https://synsight.de",
  SESSION_SECRET: "unit-test-session-secret-32chars!!",
  ALLOW_DEV_AUTH: "false",
  EMAIL_DELIVERY_MODE: "provider",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: 587,
  SMTP_SECURE: "false",
  SMTP_USER: "smtp-user",
  SMTP_PASS: "smtp-password",
  SMTP_FROM: "SynSight <noreply@synsight.de>",
  AUTO_VERIFY_EMAIL: "false",
} satisfies Environment;

describe("SMTP verification delivery", () => {
  beforeEach(() => {
    createTransport.mockClear();
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "test-message" });
  });

  it("sends the verification URL through authenticated SMTP", async () => {
    await sendVerificationEmail(env, {
      to: "new.user@example.com",
      verificationUrl: "https://synsight.de/verify-email?token=secret",
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: { user: "smtp-user", pass: "smtp-password" },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 10_000,
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "SynSight <noreply@synsight.de>",
        to: "new.user@example.com",
        subject: expect.stringContaining("bestätigen"),
        text: expect.stringContaining(
          "https://synsight.de/verify-email?token=secret"
        ),
      })
    );
  });

  it("rejects incomplete SMTP settings", async () => {
    await expect(
      sendVerificationEmail(
        { ...env, SMTP_PASS: undefined },
        {
          to: "new.user@example.com",
          verificationUrl: "https://synsight.de/verify-email?token=secret",
        }
      )
    ).rejects.toThrow("SMTP configuration is incomplete");
  });
});
