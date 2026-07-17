import { describe, expect, it } from "vitest";
import { resolveNotificationRecipient } from "@/lib/email/email-service";

describe("resolveNotificationRecipient", () => {
  it("prefers CONTACT_EMAIL env over fallback", () => {
    process.env.CONTACT_EMAIL = "ops-contact@synsight.de";
    expect(resolveNotificationRecipient("contact", "contact@synsight.de")).toBe(
      "ops-contact@synsight.de"
    );
    delete process.env.CONTACT_EMAIL;
  });

  it("falls back when env is empty", () => {
    delete process.env.PRESS_EMAIL;
    expect(resolveNotificationRecipient("press", "press@synsight.de")).toBe(
      "press@synsight.de"
    );
  });
});
