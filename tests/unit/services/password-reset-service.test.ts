import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import { verifyPassword } from "@/lib/auth/password";
import {
  getSessionRepository,
  getUserRepository,
  getUserTokenRepository,
} from "@/lib/repositories";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/services/password-reset-service";
import { hashToken } from "@/lib/utils/crypto";

vi.mock("@/lib/email/smtp", () => ({
  sanitizeSmtpError: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
  sendPasswordResetEmail: vi.fn(),
}));

describe("password-reset-service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    process.env.EMAIL_DELIVERY_MODE = "disabled";
  });

  it("does not reveal whether an email exists", async () => {
    expect(await requestPasswordReset("missing@example.com")).toBeNull();
  });

  it("issues a token, resets the password, and writes audit events", async () => {
    const user = await getUserRepository().create({
      email: "reset.me@example.com",
      username: "resetme",
      passwordHash: "old-hash",
      firstName: "Reset",
      lastName: "Me",
    });
    await getUserRepository().activate(user.id);

    const token = await requestPasswordReset(user.email);
    expect(token).toBeTruthy();

    const stored = await getUserTokenRepository().findValid(
      hashToken(token as string),
      "password_reset"
    );
    expect(stored?.userId).toBe(user.id);

    const result = await resetPasswordWithToken(
      token as string,
      "NewSecurePass1!"
    );
    expect(result).toEqual({ success: true });

    const updated = await getUserRepository().findById(user.id);
    expect(updated).toBeTruthy();
    expect(await verifyPassword(updated!.passwordHash, "NewSecurePass1!")).toBe(
      true
    );

    const reused = await resetPasswordWithToken(
      token as string,
      "AnotherSecure1!"
    );
    expect(reused).toEqual({ success: false, reason: "already_used" });

    const audit = (
      globalThis as typeof globalThis & {
        __synsightAuditEvents?: Array<{ eventType: string }>;
      }
    ).__synsightAuditEvents;
    expect(
      audit?.some((e) => e.eventType === "auth.password_reset.requested")
    ).toBe(true);
    expect(audit?.some((e) => e.eventType === "auth.password.changed")).toBe(
      true
    );
  });

  it("rejects expired tokens", async () => {
    const user = await getUserRepository().create({
      email: "expired.reset@example.com",
      username: "expiredreset",
      passwordHash: "hash",
      firstName: "Expired",
      lastName: "Reset",
    });
    await getUserRepository().activate(user.id);

    const token = "expired-password-reset-token-value-123456";
    await getUserTokenRepository().create({
      userId: user.id,
      tokenHash: hashToken(token),
      tokenType: "password_reset",
      expiresAt: new Date(Date.now() - 60_000)
        .toISOString()
        .slice(0, 23)
        .replace("T", " "),
    });

    const result = await resetPasswordWithToken(token, "NewSecurePass1!");
    expect(result).toEqual({ success: false, reason: "expired" });
  });

  it("revokes sessions after a successful reset", async () => {
    const user = await getUserRepository().create({
      email: "session.reset@example.com",
      username: "sessionreset",
      passwordHash: "hash",
      firstName: "Session",
      lastName: "Reset",
    });
    await getUserRepository().activate(user.id);

    await getSessionRepository().create({
      id: "session-1",
      userId: user.id,
      tokenHash: "session-hash",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const token = await requestPasswordReset(user.email);
    await resetPasswordWithToken(token as string, "NewSecurePass1!");

    const active =
      await getSessionRepository().findActiveByTokenHash("session-hash");
    expect(active).toBeNull();
  });

  it("skips suspended accounts without leaking existence", async () => {
    const user = await getUserRepository().create({
      email: "blocked.reset@example.com",
      username: "blockedreset",
      passwordHash: "hash",
      firstName: "Blocked",
      lastName: "Reset",
    });
    const memory = (
      globalThis as typeof globalThis & {
        __synsightUsers?: Map<number, { status: string }>;
      }
    ).__synsightUsers;
    const record = memory?.get(user.id);
    if (record) record.status = "suspended";

    expect(await requestPasswordReset(user.email)).toBeNull();
  });
});
