import nodemailer from "nodemailer";
import type { Environment } from "@/lib/config/env";

export interface VerificationEmail {
  to: string;
  verificationUrl: string;
}

/** Keep registration/login responses off the nginx 504 path. */
const SMTP_CONNECTION_TIMEOUT_MS = 8_000;
const SMTP_SOCKET_TIMEOUT_MS = 10_000;

export async function sendVerificationEmail(
  env: Environment,
  message: VerificationEmail
): Promise<void> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error("SMTP configuration is incomplete.");
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });

  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
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
  } finally {
    transport.close();
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
