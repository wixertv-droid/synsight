import nodemailer from "nodemailer";
import type { Environment } from "@/lib/config/env";

export interface VerificationEmail {
  to: string;
  verificationUrl: string;
}

export interface SmtpMailMessage {
  /** Visible From header — may differ from SMTP_USER when aliases exist. */
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/** Keep registration/login responses off the nginx 504 path. */
const SMTP_CONNECTION_TIMEOUT_MS = 8_000;
const SMTP_SOCKET_TIMEOUT_MS = 10_000;

function assertSmtpReady(env: Environment): void {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error("SMTP configuration is incomplete.");
  }
}

function createTransport(env: Environment) {
  assertSmtpReady(env);
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // Port 465 => SSL/TLS (secure: true). Port 587 => STARTTLS (secure: false).
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });
}

/**
 * Authenticate as SMTP_USER (e.g. noreply@synsight.de) while allowing a
 * dynamic visible From header (contact@, press@, support@, …).
 * Envelope MAIL FROM stays on the authenticated mailbox for provider compatibility.
 */
export async function sendSmtpMail(
  env: Environment,
  message: SmtpMailMessage
): Promise<{ messageId?: string }> {
  assertSmtpReady(env);
  const transport = createTransport(env);

  try {
    const result = await transport.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
      envelope: {
        from: env.SMTP_USER as string,
        to: message.to,
      },
    });
    return { messageId: result.messageId };
  } finally {
    transport.close();
  }
}

export async function sendVerificationEmail(
  env: Environment,
  message: VerificationEmail
): Promise<void> {
  await sendSmtpMail(env, {
    from: env.SMTP_FROM as string,
    to: message.to,
    subject: "SynSight E-Mail-Adresse bestätigen",
    text: [
      "Willkommen bei SynSight.",
      "",
      "Bestätigen Sie Ihre E-Mail-Adresse über diesen Link:",
      message.verificationUrl,
      "",
      "Der Link ist 24 Stunden gültig.",
      "Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail.",
    ].join("\n"),
    html: [
      "<p>Willkommen bei SynSight.</p>",
      "<p>Bestätigen Sie Ihre E-Mail-Adresse:</p>",
      `<p><a href="${escapeHtml(message.verificationUrl)}">E-Mail-Adresse bestätigen</a></p>`,
      "<p>Der Link ist 24 Stunden gültig.</p>",
      "<p>Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail.</p>",
    ].join(""),
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
