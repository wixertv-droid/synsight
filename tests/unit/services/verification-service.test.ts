import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import {
  issueEmailVerification,
  resendEmailVerification,
  verifyEmailToken,
} from "@/lib/services/verification-service";
import { getUserRepository } from "@/lib/repositories";

describe("verification-service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
  });

  it("activates a user with a valid token", async () => {
    const user = await getUserRepository().create({
      email: "verify.me@example.com",
      username: "verifyme",
      passwordHash: "hash",
      firstName: "Verify",
      lastName: "Me",
    });

    const token = await issueEmailVerification(user.id);
    const result = await verifyEmailToken(token);
    expect(result).toEqual({ success: true, userId: user.id });

    const activated = await getUserRepository().findById(user.id);
    expect(activated?.status).toBe("active");
  });

  it("rejects unknown tokens", async () => {
    const result = await verifyEmailToken("totally-invalid-token-value-123456");
    expect(result.success).toBe(false);
  });

  it("resends only for pending accounts", async () => {
    const pending = await getUserRepository().create({
      email: "pending.verify@example.com",
      username: "pendingverify",
      passwordHash: "hash",
      firstName: "Pending",
      lastName: "Verify",
    });
    const token = await resendEmailVerification(pending.email);
    expect(token).toBeTruthy();

    await getUserRepository().activate(pending.id);
    expect(await resendEmailVerification(pending.email)).toBeNull();
    expect(await resendEmailVerification("missing@example.com")).toBeNull();
  });
});
