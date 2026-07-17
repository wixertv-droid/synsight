import nodemailer, { type Transporter } from "nodemailer";
import type { Environment } from "@/lib/config/env";
import { buildVerificationEmail } from "@/lib/email/templates/verification-email";

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

/**
 * Async fire-and-forget delivery may take longer than an HTTP request.
 * Connection timeout in production logs was 8s — Netcup SSL handshakes
 * often need more headroom on cold connections.
 */
const SMTP_CONNECTION_TIMEOUT_MS = 20_000;
const SMTP_SOCKET_TIMEOUT_MS = 25_000;

function assertSmtpReady(env: Environment): void {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error("SMTP configuration is incomplete.");
  }
}

/** Strip secrets from error messages before logging. */
export function sanitizeSmtpError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/pass(word)?[=:]\s*\S+/gi, "pass=[redacted]")
    .replace(/SMTP_PASS=\S+/gi, "SMTP_PASS=[redacted]")
    .slice(0, 300);
}

interface TransportProfile {
  label: string;
  host: string;
  port: number;
  secure: boolean;
  requireTLS?: boolean;
}

function buildTransportProfiles(env: Environment): TransportProfile[] {
  assertSmtpReady(env);
  const host = env.SMTP_HOST as string;
  const primaryPort = env.SMTP_PORT;
  const primarySecure = env.SMTP_SECURE === "true";

  const profiles: TransportProfile[] = [
    {
      label: `primary:${host}:${primaryPort}`,
      host,
      port: primaryPort,
      secure: primarySecure,
      requireTLS: !primarySecure,
    },
  ];

  // Common VPS issue: outbound 465 blocked → fall back to STARTTLS 587.
  if (primaryPort === 465) {
    profiles.push({
      label: `fallback:${host}:587`,
      host,
      port: 587,
      secure: false,
      requireTLS: true,
    });
  } else if (primaryPort === 587) {
    profiles.push({
      label: `fallback:${host}:465`,
      host,
      port: 465,
      secure: true,
    });
  }

  return profiles;
}

function createTransport(
  env: Environment,
  profile: TransportProfile
): Transporter {
  return nodemailer.createTransport({
    host: profile.host,
    port: profile.port,
    secure: profile.secure,
    requireTLS: profile.requireTLS,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    tls: {
      // Netcup presents a valid cert for mxf*.netcup.net
      minVersion: "TLSv1.2",
      servername: profile.host,
    },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });
}

/**
 * Authenticate as SMTP_USER (e.g. noreply@synsight.de) while allowing a
 * dynamic visible From header (contact@, press@, support@, …).
 * Envelope MAIL FROM stays on the authenticated mailbox.
 */
export async function sendSmtpMail(
  env: Environment,
  message: SmtpMailMessage
): Promise<{ messageId?: string; via: string }> {
  assertSmtpReady(env);
  const profiles = buildTransportProfiles(env);
  const errors: string[] = [];

  for (const profile of profiles) {
    const transport = createTransport(env, profile);
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
      console.info(`[email:smtp] delivered via ${profile.label}`);
      return { messageId: result.messageId, via: profile.label };
    } catch (error) {
      const safe = sanitizeSmtpError(error);
      errors.push(`${profile.label}: ${safe}`);
      console.error(`[email:smtp] ${profile.label} failed: ${safe}`);
    } finally {
      transport.close();
    }
  }

  throw new Error(
    `SMTP delivery failed on all profiles. ${errors.join(" | ")}`
  );
}

export async function sendVerificationEmail(
  env: Environment,
  message: VerificationEmail
): Promise<void> {
  const template = buildVerificationEmail({
    verificationUrl: message.verificationUrl,
  });
  await sendSmtpMail(env, {
    from: env.SMTP_FROM as string,
    to: message.to,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

/** Lightweight connectivity check for ops / scripts. */
export async function verifySmtpConnection(
  env: Environment
): Promise<{ ok: boolean; via?: string; error?: string }> {
  assertSmtpReady(env);
  const profiles = buildTransportProfiles(env);

  for (const profile of profiles) {
    const transport = createTransport(env, profile);
    try {
      await transport.verify();
      return { ok: true, via: profile.label };
    } catch (error) {
      console.error(
        `[email:smtp] verify ${profile.label} failed: ${sanitizeSmtpError(error)}`
      );
    } finally {
      transport.close();
    }
  }

  return { ok: false, error: "SMTP verify failed on all profiles." };
}
