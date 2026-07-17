/**
 * Outbound notification mail for contact / press / partner forms.
 * Auth = SMTP_USER (noreply); visible From is channel-specific.
 */

import {
  getEnvironment,
  resetEnvironmentCache,
  type Environment,
} from "@/lib/config/env";
import { sanitizeSmtpError, sendSmtpMail } from "@/lib/email/smtp";
import { buildContactEmail } from "@/lib/email/templates/contact-email";
import { buildPressEmail } from "@/lib/email/templates/press-email";
import { buildPartnerEmail } from "@/lib/email/templates/partner-email";

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

/** Prefer CONTACT_EMAIL / PRESS_EMAIL / PARTNER_EMAIL env over DB settings. */
export function resolveNotificationRecipient(
  channel: EmailChannel,
  fallback: string
): string {
  const envKey =
    channel === "contact"
      ? "CONTACT_EMAIL"
      : channel === "press"
        ? "PRESS_EMAIL"
        : "PARTNER_EMAIL";
  const fromEnv = process.env[envKey]?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : fallback;
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
