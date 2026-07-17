import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";

const { sendVerificationEmail } = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(() => new Promise<void>(() => undefined)),
}));

vi.mock("@/lib/email/smtp", () => ({ sendVerificationEmail }));

import { resetEnvironmentCache } from "@/lib/config/env";
import { getUserRepository } from "@/lib/repositories";
import { issueEmailVerification } from "@/lib/services/verification-service";

describe("non-blocking verification delivery regression", () => {
  beforeEach(() => {
    resetInMemoryStores();
    resetEnvironmentCache();
    delete process.env.DATABASE_URL;
    process.env.REQUIRE_DATABASE = "false";
    process.env.EMAIL_DELIVERY_MODE = "provider";
    process.env.APP_URL = "https://synsight.de";
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.SMTP_FROM = "noreply@synsight.de";
  });

  it("returns the token without waiting for a hanging SMTP provider", async () => {
    const user = await getUserRepository().create({
      email: "smtp-timeout@example.com",
      username: "smtptimeout",
      passwordHash: "hash",
      firstName: "SMTP",
      lastName: "Timeout",
    });

    const outcome = await Promise.race([
      issueEmailVerification(user.id),
      new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), 100)
      ),
    ]);
    expect(outcome).not.toBe("timeout");
    expect(typeof outcome).toBe("string");
    expect(sendVerificationEmail).toHaveBeenCalled();
  });
});
