import type { AuthenticatedUser } from "@/lib/auth/types";
import { getCommunicationsRepository } from "@/lib/repositories";
import {
  sendContactNotification,
  sendPartnerNotification,
  sendPressNotification,
} from "@/lib/services/email-service";
import type {
  ContactRequestInput,
  PartnerRequestInput,
  PressRequestInput,
  RequestStatus,
} from "@/lib/validation/communications";
import type { CommunicationChannel } from "@/lib/repositories/communications-repository";

export class AdminForbiddenError extends Error {
  constructor(message = "Administratorrechte erforderlich.") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

export class SpamRejectedError extends Error {
  constructor() {
    super("Anfrage abgelehnt.");
    this.name = "SpamRejectedError";
  }
}

function assertAdmin(actor: AuthenticatedUser) {
  if (actor.role !== "admin") throw new AdminForbiddenError();
}

function assertNotSpam(website?: string) {
  if (website && website.length > 0) throw new SpamRejectedError();
}

export async function submitContactRequest(input: {
  data: ContactRequestInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  assertNotSpam(input.data.website);
  const repo = getCommunicationsRepository();
  const settings = await repo.getSettings();
  const record = await repo.createContactRequest({
    name: input.data.name,
    company: input.data.company ?? null,
    email: input.data.email,
    phone: input.data.phone ?? null,
    subject: input.data.subject,
    message: input.data.message,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const notification = await sendContactNotification({
    to: settings.contactEmail,
    requestId: record.id,
    name: record.name,
    email: record.email,
    subject: record.subject,
    company: record.company,
    message: record.message,
  });

  return { request: record, notification };
}

export async function submitPartnerRequest(input: {
  data: PartnerRequestInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  assertNotSpam(input.data.website);
  const repo = getCommunicationsRepository();
  const settings = await repo.getSettings();
  const record = await repo.createPartnerRequest({
    name: input.data.name,
    company: input.data.company,
    email: input.data.email,
    partnershipType: input.data.partnershipType,
    message: input.data.message,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const notification = await sendPartnerNotification({
    to: settings.partnersEmail,
    requestId: record.id,
    name: record.name,
    email: record.email,
    company: record.company,
    partnershipType: record.partnershipType,
    message: record.message,
  });

  return { request: record, notification };
}

export async function submitPressRequest(input: {
  data: PressRequestInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  assertNotSpam(input.data.website);
  const repo = getCommunicationsRepository();
  const settings = await repo.getSettings();
  const record = await repo.createPressRequest({
    name: input.data.name,
    medium: input.data.medium,
    email: input.data.email,
    phone: input.data.phone ?? null,
    topic: input.data.topic,
    message: input.data.message,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const notification = await sendPressNotification({
    to: settings.pressEmail,
    requestId: record.id,
    name: record.name,
    email: record.email,
    medium: record.medium,
    topic: record.topic,
    message: record.message,
  });

  return { request: record, notification };
}

export async function getCommunicationSettings(actor: AuthenticatedUser) {
  assertAdmin(actor);
  return getCommunicationsRepository().getSettings();
}

export async function updateCommunicationSettings(input: {
  actor: AuthenticatedUser;
  contactEmail: string;
  pressEmail: string;
  partnersEmail: string;
}) {
  assertAdmin(input.actor);
  return getCommunicationsRepository().updateSettings({
    contactEmail: input.contactEmail,
    pressEmail: input.pressEmail,
    partnersEmail: input.partnersEmail,
    adminId: Number(input.actor.id),
  });
}

export async function listCommunicationRequests(actor: AuthenticatedUser) {
  assertAdmin(actor);
  const repo = getCommunicationsRepository();
  const [contact, partner, press] = await Promise.all([
    repo.listContactRequests(),
    repo.listPartnerRequests(),
    repo.listPressRequests(),
  ]);
  return { contact, partner, press };
}

export async function updateCommunicationRequestStatus(input: {
  actor: AuthenticatedUser;
  channel: CommunicationChannel;
  id: number;
  status: RequestStatus;
  adminNotes?: string | null;
}) {
  assertAdmin(input.actor);
  const updated = await getCommunicationsRepository().updateRequestStatus({
    channel: input.channel,
    id: input.id,
    status: input.status,
    adminNotes: input.adminNotes,
  });
  if (!updated) {
    throw new Error("REQUEST_NOT_FOUND");
  }
  return updated;
}

export async function getCommunicationInboxSummary(actor: AuthenticatedUser) {
  assertAdmin(actor);
  const requests = await listCommunicationRequests(actor);

  const summarize = (
    rows: Array<{ status: RequestStatus }>
  ): { total: number; newCount: number } => ({
    total: rows.length,
    newCount: rows.filter((row) => row.status === "new").length,
  });

  const contact = summarize(requests.contact);
  const partner = summarize(requests.partner);
  const press = summarize(requests.press);

  return {
    total: contact.total + partner.total + press.total,
    newCount: contact.newCount + partner.newCount + press.newCount,
    byChannel: { contact, partner, press },
  };
}

async function findCommunicationRequest(
  channel: CommunicationChannel,
  id: number
) {
  const repo = getCommunicationsRepository();
  const rows =
    channel === "contact"
      ? await repo.listContactRequests()
      : channel === "partner"
        ? await repo.listPartnerRequests()
        : await repo.listPressRequests();
  return rows.find((row) => row.id === id) ?? null;
}

function mailboxForChannel(
  channel: CommunicationChannel,
  settings: Awaited<
    ReturnType<ReturnType<typeof getCommunicationsRepository>["getSettings"]>
  >
): string {
  if (channel === "contact") return settings.contactEmail;
  if (channel === "press") return settings.pressEmail;
  return settings.partnersEmail;
}

/**
 * Forward a message to the mailbox of its own tab:
 * Kontakt → contactEmail, Presse → pressEmail, Partnerschaft → partnersEmail.
 */
export async function forwardCommunicationRequest(input: {
  actor: AuthenticatedUser;
  channel: CommunicationChannel;
  id: number;
}) {
  assertAdmin(input.actor);
  const repo = getCommunicationsRepository();
  const settings = await repo.getSettings();
  const request = await findCommunicationRequest(input.channel, input.id);
  if (!request) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  const to = mailboxForChannel(input.channel, settings);
  let notification;

  if (input.channel === "contact" && "subject" in request) {
    notification = await sendContactNotification({
      to,
      requestId: request.id,
      name: request.name,
      email: request.email,
      subject: `[Weiterleitung] ${request.subject}`,
      company: request.company,
      message: request.message,
    });
  } else if (input.channel === "partner" && "partnershipType" in request) {
    notification = await sendPartnerNotification({
      to,
      requestId: request.id,
      name: request.name,
      email: request.email,
      company: request.company,
      partnershipType: `[Weiterleitung] ${request.partnershipType}`,
      message: request.message,
    });
  } else if (input.channel === "press" && "topic" in request) {
    notification = await sendPressNotification({
      to,
      requestId: request.id,
      name: request.name,
      email: request.email,
      medium: request.medium,
      topic: `[Weiterleitung] ${request.topic}`,
      message: request.message,
    });
  } else {
    throw new Error("REQUEST_NOT_FOUND");
  }

  if (request.status === "new") {
    await repo.updateRequestStatus({
      channel: input.channel,
      id: input.id,
      status: "processing",
      adminNotes: `Weitergeleitet an: ${notification.payload.to}`,
    });
  }

  return {
    id: input.id,
    channel: input.channel,
    to: notification.payload.to,
    delivered: notification.delivered,
    queued: notification.queued,
    message: notification.message,
  };
}

export async function deleteCommunicationRequest(input: {
  actor: AuthenticatedUser;
  channel: CommunicationChannel;
  id: number;
}) {
  assertAdmin(input.actor);
  const deleted = await getCommunicationsRepository().deleteRequest({
    channel: input.channel,
    id: input.id,
  });
  if (!deleted) {
    throw new Error("REQUEST_NOT_FOUND");
  }
  return { deleted: true, channel: input.channel, id: input.id };
}
