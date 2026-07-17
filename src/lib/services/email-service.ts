/**
 * Outbound notification mail for contact / press / partner forms.
 * Uses the shared SMTP transport (auth = SMTP_USER / noreply) with a
 * channel-specific visible From address.
 */

import {
  getEnvironment,
  resetEnvironmentCache,
  type Environment,
} from "@/lib/config/env";
import { sendSmtpMail } from "@/lib/email/smtp";

export type EmailChannel = "contact" | "press" | "partner";

export interface EmailNotificationPayload {
  channel: EmailChannel;
  to: string;
  subject: string;
  preview: string;
  requestId: number;
  replyTo: string;
  metadata: Record<string, string | number | null | undefined>;
}

export interface EmailDispatchResult {
  queued: boolean;
  delivered: boolean;
  provider: "smtp" | "stub" | "log-link" | "disabled";
  payload: EmailNotificationPayload;
  message: string;
  messageId?: string;
}

const CHANNEL_FROM: Record<EmailChannel, string> = {
  contact: "SynSight Kontakt <contact@synsight.de>",
  press: "SynSight Presse <press@synsight.de>",
  partner: "SynSight Partnerschaften <partners@synsight.de>",
};

function deliveryMode(): string {
  return process.env.EMAIL_DELIVERY_MODE ?? "log-link";
}

function resolveEnv(): Environment {
  resetEnvironmentCache();
  return getEnvironment();
}

async function dispatchNotification(input: {
  channel: EmailChannel;
  to: string;
  subject: string;
  preview: string;
  requestId: number;
  replyTo: string;
  bodyText: string;
  bodyHtml: string;
  metadata: Record<string, string | number | null | undefined>;
}): Promise<EmailDispatchResult> {
  const payload: EmailNotificationPayload = {
    channel: input.channel,
    to: input.to,
    subject: input.subject,
    preview: input.preview,
    requestId: input.requestId,
    replyTo: input.replyTo,
    metadata: input.metadata,
  };

  const mode = deliveryMode();

  if (mode === "disabled") {
    return {
      queued: false,
      delivered: false,
      provider: "disabled",
      payload,
      message: "E-Mail-Versand ist deaktiviert.",
    };
  }

  if (mode === "log-link") {
    console.info(
      `[email:log-link] ${input.channel} → ${input.to}: ${input.subject}`
    );
    return {
      queued: true,
      delivered: false,
      provider: "log-link",
      payload,
      message: "E-Mail im log-link Modus protokolliert (kein SMTP-Versand).",
    };
  }

  try {
    const env = resolveEnv();
    const result = await sendSmtpMail(env, {
      from: CHANNEL_FROM[input.channel],
      to: input.to,
      subject: input.subject,
      text: input.bodyText,
      html: input.bodyHtml,
      replyTo: input.replyTo,
    });
    return {
      queued: true,
      delivered: true,
      provider: "smtp",
      payload,
      message: "E-Mail erfolgreich über SMTP versendet.",
      messageId: result.messageId,
    };
  } catch (error) {
    console.error(
      `[email:provider] ${input.channel} delivery failed:`,
      error instanceof Error ? error.message : error
    );
    console.info(
      `[email:fallback-log] ${input.channel} → ${input.to}: ${input.subject}`
    );
    return {
      queued: true,
      delivered: false,
      provider: "stub",
      payload,
      message:
        "SMTP-Versand fehlgeschlagen — Anfrage ist gespeichert, Benachrichtigung wurde geloggt.",
    };
  }
}

export async function sendContactNotification(input: {
  to: string;
  requestId: number;
  name: string;
  email: string;
  subject: string;
  company?: string | null;
  message?: string | null;
}): Promise<EmailDispatchResult> {
  const lines = [
    "Neue Kontaktanfrage über synsight.de",
    "",
    `Name: ${input.name}`,
    `E-Mail: ${input.email}`,
    input.company ? `Firma: ${input.company}` : null,
    `Betreff: ${input.subject}`,
    `Anfrage-ID: ${input.requestId}`,
    "",
    input.message ? `Nachricht:\n${input.message}` : null,
  ].filter(Boolean) as string[];

  return dispatchNotification({
    channel: "contact",
    to: input.to,
    subject: `[SynSight Kontakt] ${input.subject}`,
    preview: `Neue Kontaktanfrage von ${input.name} <${input.email}>`,
    requestId: input.requestId,
    replyTo: input.email,
    bodyText: lines.join("\n"),
    bodyHtml: `<p>Neue Kontaktanfrage über synsight.de</p><ul><li><strong>Name:</strong> ${escapeHtml(input.name)}</li><li><strong>E-Mail:</strong> ${escapeHtml(input.email)}</li>${input.company ? `<li><strong>Firma:</strong> ${escapeHtml(input.company)}</li>` : ""}<li><strong>Betreff:</strong> ${escapeHtml(input.subject)}</li><li><strong>ID:</strong> ${input.requestId}</li></ul>${input.message ? `<p><strong>Nachricht:</strong></p><p>${escapeHtml(input.message).replaceAll("\n", "<br/>")}</p>` : ""}`,
    metadata: {
      name: input.name,
      company: input.company ?? null,
      subject: input.subject,
    },
  });
}

export async function sendPressNotification(input: {
  to: string;
  requestId: number;
  name: string;
  email: string;
  medium: string;
  topic: string;
  message?: string | null;
}): Promise<EmailDispatchResult> {
  const lines = [
    "Neue Presseanfrage über synsight.de",
    "",
    `Name: ${input.name}`,
    `Medium: ${input.medium}`,
    `E-Mail: ${input.email}`,
    `Thema: ${input.topic}`,
    `Anfrage-ID: ${input.requestId}`,
    "",
    input.message ? `Nachricht:\n${input.message}` : null,
  ].filter(Boolean) as string[];

  return dispatchNotification({
    channel: "press",
    to: input.to,
    subject: `[SynSight Presse] ${input.topic}`,
    preview: `Presseanfrage von ${input.name} (${input.medium})`,
    requestId: input.requestId,
    replyTo: input.email,
    bodyText: lines.join("\n"),
    bodyHtml: `<p>Neue Presseanfrage über synsight.de</p><ul><li><strong>Name:</strong> ${escapeHtml(input.name)}</li><li><strong>Medium:</strong> ${escapeHtml(input.medium)}</li><li><strong>E-Mail:</strong> ${escapeHtml(input.email)}</li><li><strong>Thema:</strong> ${escapeHtml(input.topic)}</li><li><strong>ID:</strong> ${input.requestId}</li></ul>${input.message ? `<p><strong>Nachricht:</strong></p><p>${escapeHtml(input.message).replaceAll("\n", "<br/>")}</p>` : ""}`,
    metadata: {
      name: input.name,
      medium: input.medium,
      topic: input.topic,
    },
  });
}

export async function sendPartnerNotification(input: {
  to: string;
  requestId: number;
  name: string;
  email: string;
  company: string;
  partnershipType: string;
  message?: string | null;
}): Promise<EmailDispatchResult> {
  const lines = [
    "Neue Partnerschaftsanfrage über synsight.de",
    "",
    `Name: ${input.name}`,
    `Unternehmen: ${input.company}`,
    `E-Mail: ${input.email}`,
    `Art: ${input.partnershipType}`,
    `Anfrage-ID: ${input.requestId}`,
    "",
    input.message ? `Nachricht:\n${input.message}` : null,
  ].filter(Boolean) as string[];

  return dispatchNotification({
    channel: "partner",
    to: input.to,
    subject: `[SynSight Partnerschaft] ${input.company}`,
    preview: `Partnerschaftsanfrage von ${input.name} (${input.company})`,
    requestId: input.requestId,
    replyTo: input.email,
    bodyText: lines.join("\n"),
    bodyHtml: `<p>Neue Partnerschaftsanfrage über synsight.de</p><ul><li><strong>Name:</strong> ${escapeHtml(input.name)}</li><li><strong>Unternehmen:</strong> ${escapeHtml(input.company)}</li><li><strong>E-Mail:</strong> ${escapeHtml(input.email)}</li><li><strong>Art:</strong> ${escapeHtml(input.partnershipType)}</li><li><strong>ID:</strong> ${input.requestId}</li></ul>${input.message ? `<p><strong>Nachricht:</strong></p><p>${escapeHtml(input.message).replaceAll("\n", "<br/>")}</p>` : ""}`,
    metadata: {
      name: input.name,
      company: input.company,
      partnershipType: input.partnershipType,
    },
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
