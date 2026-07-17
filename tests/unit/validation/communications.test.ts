import { describe, expect, it } from "vitest";
import {
  contactRequestSchema,
  partnerRequestSchema,
  pressRequestSchema,
  communicationSettingsSchema,
} from "@/lib/validation/communications";

describe("communications validation", () => {
  it("accepts a valid contact request", () => {
    const parsed = contactRequestSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      subject: "Produktfrage",
      message: "Ich interessiere mich für SynSight Analyse.",
      company: "Analytical Engines",
      phone: "+49 123",
      website: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects short contact messages", () => {
    const parsed = contactRequestSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      subject: "Hi",
      message: "Kurz",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects filled honeypot", () => {
    const parsed = contactRequestSchema.safeParse({
      name: "Bot",
      email: "bot@example.com",
      subject: "Spam",
      message: "Dies ist eine Spam-Nachricht.",
      website: "https://spam.example",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts partner and press payloads", () => {
    expect(
      partnerRequestSchema.safeParse({
        name: "Partner",
        company: "Acme GmbH",
        email: "partner@acme.de",
        partnershipType: "Technologiepartner",
        message: "Wir möchten integrieren und gemeinsam skalieren.",
      }).success
    ).toBe(true);

    expect(
      pressRequestSchema.safeParse({
        name: "Reporter",
        medium: "Tech Daily",
        email: "news@techdaily.de",
        topic: "Interview",
        message: "Wir möchten ein Hintergrundgespräch führen.",
      }).success
    ).toBe(true);
  });

  it("validates communication settings emails", () => {
    expect(
      communicationSettingsSchema.safeParse({
        contactEmail: "contact@synsight.de",
        pressEmail: "press@synsight.de",
        partnersEmail: "partners@synsight.de",
      }).success
    ).toBe(true);

    expect(
      communicationSettingsSchema.safeParse({
        contactEmail: "not-an-email",
        pressEmail: "press@synsight.de",
        partnersEmail: "partners@synsight.de",
      }).success
    ).toBe(false);
  });
});
