/**
 * Email delivery stub — prepares notification payloads for later SMTP /
 * provider integration. No messages are sent yet.
 */

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
  provider: "stub";
  payload: EmailNotificationPayload;
  message: string;
}

function stubResult(payload: EmailNotificationPayload): EmailDispatchResult {
  return {
    queued: true,
    delivered: false,
    provider: "stub",
    payload,
    message:
      "E-Mail-Benachrichtigung vorbereitet. SMTP-/Provider-Versand folgt in einem späteren Sprint.",
  };
}

export async function sendContactNotification(input: {
  to: string;
  requestId: number;
  name: string;
  email: string;
  subject: string;
  company?: string | null;
}): Promise<EmailDispatchResult> {
  return stubResult({
    channel: "contact",
    to: input.to,
    subject: `[SynSight Kontakt] ${input.subject}`,
    preview: `Neue Kontaktanfrage von ${input.name} <${input.email}>`,
    requestId: input.requestId,
    replyTo: input.email,
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
}): Promise<EmailDispatchResult> {
  return stubResult({
    channel: "press",
    to: input.to,
    subject: `[SynSight Presse] ${input.topic}`,
    preview: `Presseanfrage von ${input.name} (${input.medium})`,
    requestId: input.requestId,
    replyTo: input.email,
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
}): Promise<EmailDispatchResult> {
  return stubResult({
    channel: "partner",
    to: input.to,
    subject: `[SynSight Partnerschaft] ${input.company}`,
    preview: `Partnerschaftsanfrage von ${input.name} (${input.company})`,
    requestId: input.requestId,
    replyTo: input.email,
    metadata: {
      name: input.name,
      company: input.company,
      partnershipType: input.partnershipType,
    },
  });
}
