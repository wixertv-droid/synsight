/**
 * Outbound notification mail for contact / press / partner forms.
 * Auth = SMTP_USER (noreply); visible From is channel-specific.
 */

import { sanitizeSmtpError, sendSmtpMail } from "@/lib/email/smtp";
import {
  resolveMailAccountRuntime,
  type MailAccountKey,
} from "@/lib/services/mail-settings-service";
import { buildContactEmail } from "@/lib/email/templates/contact-email";
import { buildPressEmail } from "@/lib/email/templates/press-email";
import { buildPartnerEmail } from "@/lib/email/templates/partner-email";

export type EmailChannel = "contact" | "press" | "partner" | "support";

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
  support: "SynSight Support <support@synsight.de>",
};

/**
 * The address configured in the admin area is authoritative.
 * Environment variables remain only as a legacy fallback.
 */
export function resolveNotificationRecipient(
  channel: EmailChannel,
  fallback: string
): string {
  const configured = fallback.trim();
  if (configured.length > 0) return configured;

  const envKey =
    channel === "contact"
      ? "CONTACT_EMAIL"
      : channel === "press"
        ? "PRESS_EMAIL"
        : channel === "support"
          ? "SUPPORT_EMAIL"
          : "PARTNER_EMAIL";

  return process.env[envKey]?.trim() || fallback;
}

async function dispatchNotification(input: {
  channel: EmailChannel;
  account: MailAccountKey;
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

  const runtime = await resolveMailAccountRuntime(input.account);

  // Wichtig:
  // E-Mail AUS bedeutet nur: keine zusätzliche Benachrichtigung.
  // Die Formularanfrage wurde zu diesem Zeitpunkt bereits intern gespeichert.
  if (!runtime.enabled) {
    return {
      queued: false,
      delivered: false,
      provider: "disabled",
      payload,
      message: "E-Mail-Benachrichtigung ist für dieses Postfach deaktiviert.",
    };
  }

  if (!runtime.config) {
    console.error(
      `[email:provider] ${input.channel} SMTP unavailable: ${
        runtime.error ?? "unknown error"
      }`
    );

    return {
      queued: true,
      delivered: false,
      provider: "stub",
      payload,
      message:
        "Die Anfrage wurde intern gespeichert. Die E-Mail-Benachrichtigung konnte nicht gesendet werden.",
    };
  }

  try {
    const env = runtime.config;
    const result = await sendSmtpMail(env, {
      from: env.SMTP_FROM ?? CHANNEL_FROM[input.channel],
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
      `[email:provider] ${input.channel} delivery failed: ${sanitizeSmtpError(error)}`
    );
    console.info(
      `[email:fallback-log] ${input.channel} notification queued offline (request saved)`
    );
    return {
      queued: true,
      delivered: false,
      provider: "stub",
      payload,
      message:
        "Ihre Anfrage wurde gespeichert. Die Benachrichtigung konnte vorübergehend nicht zugestellt werden.",
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
  const template = buildContactEmail({
    name: input.name,
    email: input.email,
    subject: input.subject,
    company: input.company,
    message: input.message,
    requestId: input.requestId,
  });

  return dispatchNotification({
    channel: "contact",
    account: "contact",
    to: resolveNotificationRecipient("contact", input.to),
    subject: template.subject,
    preview: `Neue Kontaktanfrage von ${input.name} <${input.email}>`,
    requestId: input.requestId,
    replyTo: input.email,
    bodyText: template.text,
    bodyHtml: template.html,
    metadata: {
      name: input.name,
      company: input.company ?? null,
      subject: input.subject,
    },
  });
}

export async function sendSupportNotification(input: {
  to: string;
  requestId: number;
  name: string;
  email: string;
  subject: string;
  company?: string | null;
  message?: string | null;
}): Promise<EmailDispatchResult> {
  const template = buildContactEmail({
    name: input.name,
    email: input.email,
    subject: input.subject,
    company: input.company,
    message: input.message,
    requestId: input.requestId,
    channelLabel: "Supportanfrage",
    subjectPrefix: "Support",
  });

  return dispatchNotification({
    channel: "support",
    account: "support",
    to: resolveNotificationRecipient("support", input.to),
    subject: template.subject,
    preview: `Neue Supportanfrage von ${input.name} <${input.email}>`,
    requestId: input.requestId,
    replyTo: input.email,
    bodyText: template.text,
    bodyHtml: template.html,
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
  const template = buildPressEmail({
    name: input.name,
    email: input.email,
    medium: input.medium,
    topic: input.topic,
    message: input.message,
    requestId: input.requestId,
  });

  return dispatchNotification({
    channel: "press",
    account: "press",
    to: resolveNotificationRecipient("press", input.to),
    subject: template.subject,
    preview: `Presseanfrage von ${input.name} (${input.medium})`,
    requestId: input.requestId,
    replyTo: input.email,
    bodyText: template.text,
    bodyHtml: template.html,
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
  const template = buildPartnerEmail({
    name: input.name,
    email: input.email,
    company: input.company,
    partnershipType: input.partnershipType,
    message: input.message,
    requestId: input.requestId,
  });

  return dispatchNotification({
    channel: "partner",
    account: "partner",
    to: resolveNotificationRecipient("partner", input.to),
    subject: template.subject,
    preview: `Partnerschaftsanfrage von ${input.name} (${input.company})`,
    requestId: input.requestId,
    replyTo: input.email,
    bodyText: template.text,
    bodyHtml: template.html,
    metadata: {
      name: input.name,
      company: input.company,
      partnershipType: input.partnershipType,
    },
  });
}
