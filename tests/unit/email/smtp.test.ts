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

import { sendSmtpMail, sendVerificationEmail } from "@/lib/email/smtp";

const env = {
  NODE_ENV: "production",
  REQUIRE_DATABASE: "true",
  DATABASE_URL: "mysql://user:password@localhost:3306/synsight",
  APP_URL: "https://synsight.de",
  SESSION_SECRET: "unit-test-session-secret-32chars!!",
  ALLOW_DEV_AUTH: "false",
  EMAIL_DELIVERY_MODE: "provider",
  SMTP_HOST: "mxf920.netcup.net",
  SMTP_PORT: 465,
  SMTP_SECURE: "true",
  SMTP_USER: "noreply@synsight.de",
  SMTP_PASS: "smtp-password",
  SMTP_FROM: "SynSight <noreply@synsight.de>",
  AUTO_VERIFY_EMAIL: "false",
} satisfies Environment;

describe("SMTP delivery", () => {
  beforeEach(() => {
    createTransport.mockClear();
    sendMail.mockReset();
    close.mockClear();
    sendMail.mockResolvedValue({ messageId: "test-message" });
  });

  it("authenticates as SMTP_USER with SSL on port 465", async () => {
    await sendVerificationEmail(env, {
      to: "new.user@example.com",
      verificationUrl: "https://synsight.de/verify-email?token=secret",
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: "mxf920.netcup.net",
      port: 465,
      secure: true,
      auth: { user: "noreply@synsight.de", pass: "smtp-password" },
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
        envelope: {
          from: "noreply@synsight.de",
          to: "new.user@example.com",
        },
      })
    );
    expect(close).toHaveBeenCalled();
  });

  it("allows a dynamic From while keeping envelope on SMTP_USER", async () => {
    await sendSmtpMail(env, {
      from: "SynSight Kontakt <contact@synsight.de>",
      to: "ops@synsight.de",
      subject: "Test",
      text: "Hallo",
      replyTo: "visitor@example.com",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "SynSight Kontakt <contact@synsight.de>",
        replyTo: "visitor@example.com",
        envelope: {
          from: "noreply@synsight.de",
          to: "ops@synsight.de",
        },
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
