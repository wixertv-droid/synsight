import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  AdminForbiddenError,
  deleteCommunicationRequest,
  forwardCommunicationRequest,
  getCommunicationInboxSummary,
  getCommunicationSettings,
  listCommunicationRequests,
  submitContactRequest,
  submitPartnerRequest,
  submitPressRequest,
  submitSupportRequest,
  updateCommunicationRequestStatus,
  updateCommunicationSettings,
} from "@/lib/services/communications-service";
import {
  sendContactNotification,
  sendPartnerNotification,
  sendPressNotification,
  sendSupportNotification,
} from "@/lib/services/email-service";

const admin: AuthenticatedUser = {
  id: "1",
  displayName: "Admin",
  email: "admin@synsight.local",
  role: "admin",
};

describe("communications-service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    process.env.EMAIL_DELIVERY_MODE = "log-link";
  });

  it("stores contact requests and prepares email notifications", async () => {
    const result = await submitContactRequest({
      data: {
        name: "Max Mustermann",
        email: "max@example.com",
        subject: "Frage zur Plattform",
        message: "Können Sie mir mehr über SynCredits erklären?",
        website: "",
      },
      ipAddress: "127.0.0.1",
    });

    expect(result.request.id).toBeGreaterThan(0);
    expect(result.request.status).toBe("new");
    expect(result.notification.delivered).toBe(false);
    expect(result.notification.queued).toBe(true);
    expect(result.notification.payload.to).toBe("contact@synsight.de");
  });

  it("stores partner, press and support requests", async () => {
    const partner = await submitPartnerRequest({
      data: {
        name: "Lia Partner",
        company: "SecureOps",
        email: "lia@secureops.de",
        partnershipType: "Integrationen",
        message: "Wir möchten eine API-Integration evaluieren.",
        website: "",
      },
    });
    const press = await submitPressRequest({
      data: {
        name: "Nora Press",
        medium: "Cyber Weekly",
        email: "nora@cyberweekly.de",
        topic: "Produktlaunch",
        message: "Bitte um Statement zur digitalen Identität.",
        website: "",
      },
    });
    const support = await submitSupportRequest({
      data: {
        name: "Sven Support",
        email: "sven@example.de",
        subject: "Technische Anfrage",
        message: "Bitte prüfen Sie mein technisches Anliegen im Dashboard.",
        website: "",
      },
    });

    expect(partner.request.company).toBe("SecureOps");
    expect(press.request.medium).toBe("Cyber Weekly");
    expect(support.request.subject).toBe("Technische Anfrage");
    expect(support.notification.payload.to).toBe("support@synsight.de");

    const listed = await listCommunicationRequests(admin);
    expect(listed.partner).toHaveLength(1);
    expect(listed.press).toHaveLength(1);
    expect(listed.support).toHaveLength(1);
  });

  it("allows admins to update settings and request status", async () => {
    await expect(
      getCommunicationSettings({
        id: "2",
        displayName: "User",
        email: "user@test.local",
        role: "user",
      })
    ).rejects.toBeInstanceOf(AdminForbiddenError);

    const settings = await updateCommunicationSettings({
      actor: admin,
      contactEmail: "hello@synsight.de",
      pressEmail: "media@synsight.de",
      partnersEmail: "coop@synsight.de",
      supportEmail: "hilfe@synsight.de",
      privacyEmail: "privacy@synsight.de",
    });
    expect(settings.contactEmail).toBe("hello@synsight.de");
    expect(settings.supportEmail).toBe("hilfe@synsight.de");

    const created = await submitContactRequest({
      data: {
        name: "Test",
        email: "test@example.com",
        subject: "Support",
        message: "Eine längere Testnachricht für den Statuswechsel.",
        website: "",
      },
    });

    const updated = await updateCommunicationRequestStatus({
      actor: admin,
      channel: "contact",
      id: created.request.id,
      status: "answered",
    });
    expect(updated.status).toBe("answered");
  });

  it("summarizes total and new inbox messages for admins", async () => {
    await submitContactRequest({
      data: {
        name: "Inbox A",
        email: "a@example.com",
        subject: "Hallo",
        message: "Eine Nachricht für die Inbox-Zusammenfassung.",
        website: "",
      },
    });
    await submitPartnerRequest({
      data: {
        name: "Inbox B",
        company: "Partner GmbH",
        email: "b@example.com",
        partnershipType: "Reseller",
        message: "Partneranfrage für die Inbox-Zusammenfassung.",
        website: "",
      },
    });
    await submitSupportRequest({
      data: {
        name: "Inbox C",
        email: "c@example.com",
        subject: "Support",
        message: "Supportanfrage für die Inbox-Zusammenfassung.",
        website: "",
      },
    });

    const summary = await getCommunicationInboxSummary(admin);
    expect(summary.total).toBe(3);
    expect(summary.newCount).toBe(3);
    expect(summary.byChannel.contact.newCount).toBe(1);
    expect(summary.byChannel.partner.newCount).toBe(1);
    expect(summary.byChannel.support.newCount).toBe(1);
  });

  it("forwards messages to the mailbox of their own channel tab", async () => {
    const created = await submitContactRequest({
      data: {
        name: "Wichtig",
        email: "wichtig@example.com",
        subject: "Dringend",
        message: "Bitte an das Kontakt-Postfach weiterleiten.",
        website: "",
      },
    });

    const forwarded = await forwardCommunicationRequest({
      actor: admin,
      channel: "contact",
      id: created.request.id,
    });

    expect(forwarded.to).toBe("contact@synsight.de");

    const listed = await listCommunicationRequests(admin);
    const row = listed.contact.find((entry) => entry.id === created.request.id);
    expect(row?.status).toBe("processing");
    expect(row?.adminNotes).toMatch(/Weitergeleitet an/);
  });

  it("deletes communication requests", async () => {
    const created = await submitContactRequest({
      data: {
        name: "Löschen",
        email: "delete@example.com",
        subject: "Weg damit",
        message: "Diese Nachricht soll gelöscht werden können.",
        website: "",
      },
    });

    await deleteCommunicationRequest({
      actor: admin,
      channel: "contact",
      id: created.request.id,
    });

    const listed = await listCommunicationRequests(admin);
    expect(
      listed.contact.find((entry) => entry.id === created.request.id)
    ).toBeUndefined();
  });
});

describe("email-service delivery modes", () => {
  beforeEach(() => {
    process.env.EMAIL_DELIVERY_MODE = "log-link";
  });

  it("logs contact notifications in log-link mode", async () => {
    const contact = await sendContactNotification({
      to: "contact@synsight.de",
      requestId: 1,
      name: "A",
      email: "a@b.de",
      subject: "Hallo",
    });
    expect(contact.provider).toBe("log-link");
    expect(contact.delivered).toBe(false);
    expect(contact.queued).toBe(true);
  });

  it("returns disabled result when delivery is off", async () => {
    process.env.EMAIL_DELIVERY_MODE = "disabled";
    const press = await sendPressNotification({
      to: "press@synsight.de",
      requestId: 2,
      name: "B",
      email: "b@c.de",
      medium: "Mag",
      topic: "Thema",
    });
    expect(press.provider).toBe("disabled");
    expect(press.delivered).toBe(false);
  });

  it("logs support notifications in log-link mode", async () => {
    const support = await sendSupportNotification({
      to: "support@synsight.de",
      requestId: 3,
      name: "C",
      email: "c@d.de",
      subject: "Support",
    });
    expect(support.payload.channel).toBe("support");
    expect(support.provider).toBe("log-link");
    expect(support.queued).toBe(true);
  });
});
