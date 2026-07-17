import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "@/lib/config/env";

const { sendMail, createTransport, close, verify } = vi.hoisted(() => {
  const hoistedSendMail = vi.fn();
  const hoistedClose = vi.fn();
  const hoistedVerify = vi.fn();
  return {
    sendMail: hoistedSendMail,
    close: hoistedClose,
    verify: hoistedVerify,
    createTransport: vi.fn(() => ({
      sendMail: hoistedSendMail,
      close: hoistedClose,
      verify: hoistedVerify,
    })),
  };
});

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import {
  sanitizeSmtpError,
  sendSmtpMail,
  sendVerificationEmail,
} from "@/lib/email/smtp";
import { buildVerificationEmail } from "@/lib/email/templates/verification-email";

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
    verify.mockReset();
    sendMail.mockResolvedValue({ messageId: "test-message" });
  });

  it("authenticates as SMTP_USER with SSL on port 465", async () => {
    await sendVerificationEmail(env, {
      to: "new.user@example.com",
      verificationUrl: "https://synsight.de/verify-email?token=secret",
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "mxf920.netcup.net",
        port: 465,
        secure: true,
        family: 4,
        auth: { user: "noreply@synsight.de", pass: "smtp-password" },
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 25_000,
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "SynSight <noreply@synsight.de>",
        to: "new.user@example.com",
        subject: "Bestätigen Sie Ihr SynSight Konto",
        text: expect.stringContaining(
          "https://synsight.de/verify-email?token=secret"
        ),
        html: expect.stringContaining("E-Mail-Adresse bestätigen"),
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

  it("falls back to port 587 when 465 times out", async () => {
    sendMail
      .mockRejectedValueOnce(new Error("Connection timeout"))
      .mockResolvedValueOnce({ messageId: "via-587" });

    const result = await sendSmtpMail(env, {
      from: env.SMTP_FROM as string,
      to: "ops@synsight.de",
      subject: "Fallback",
      text: "ok",
    });

    expect(result.via).toContain("587");
    expect(createTransport).toHaveBeenCalledTimes(2);
    expect(createTransport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ port: 587, secure: false, requireTLS: true })
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

  it("redacts secrets in SMTP error messages", () => {
    expect(
      sanitizeSmtpError(new Error("auth failed SMTP_PASS=supersecret"))
    ).not.toContain("supersecret");
  });
});

describe("verification email template", () => {
  it("uses the production subject and CTA", () => {
    const template = buildVerificationEmail({
      verificationUrl: "https://synsight.de/verify-email?token=abc",
    });
    expect(template.subject).toBe("Bestätigen Sie Ihr SynSight Konto");
    expect(template.text).toContain("Willkommen bei SynSight.");
    expect(template.html).toContain("SYN");
    expect(template.html).toContain("SIGHT");
    expect(template.html).toContain("E-Mail-Adresse bestätigen");
  });
});
