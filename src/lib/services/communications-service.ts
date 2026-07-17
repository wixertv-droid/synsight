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
