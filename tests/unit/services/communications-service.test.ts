import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  AdminForbiddenError,
  getCommunicationSettings,
  listCommunicationRequests,
  submitContactRequest,
  submitPartnerRequest,
  submitPressRequest,
  updateCommunicationRequestStatus,
  updateCommunicationSettings,
} from "@/lib/services/communications-service";
import {
  sendContactNotification,
  sendPartnerNotification,
  sendPressNotification,
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

  it("stores partner and press requests", async () => {
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

    expect(partner.request.company).toBe("SecureOps");
    expect(press.request.medium).toBe("Cyber Weekly");

    const listed = await listCommunicationRequests(admin);
    expect(listed.partner).toHaveLength(1);
    expect(listed.press).toHaveLength(1);
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
    });
    expect(settings.contactEmail).toBe("hello@synsight.de");

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
});
