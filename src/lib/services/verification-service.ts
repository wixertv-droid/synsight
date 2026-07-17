import {
  getAuditRepository,
  getUserRepository,
  getUserTokenRepository,
} from "@/lib/repositories";
import { createOpaqueToken, hashToken } from "@/lib/utils/crypto";
import { getEnvironment, resetEnvironmentCache } from "@/lib/config/env";
import { getObservability } from "@/lib/observability";
import { sanitizeSmtpError, sendVerificationEmail } from "@/lib/email/smtp";

const VERIFICATION_TTL_MS = 24 * 60 * 60_000;

function resolveAppUrl(): string {
  const fromProcess = process.env.APP_URL?.trim();
  if (fromProcess) return fromProcess.replace(/\/$/, "");

  try {
    return getEnvironment().APP_URL.replace(/\/$/, "");
  } catch {
    return "https://synsight.de";
  }
}

function buildVerificationUrl(token: string): string {
  return `${resolveAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

async function deliverVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const mode = process.env.EMAIL_DELIVERY_MODE ?? "log-link";
  const url = buildVerificationUrl(token);

  if (mode === "disabled") {
    return;
  }

  if (mode === "log-link") {
    console.info(`[email:log-link] verification for ${email}: ${url}`);
    getObservability().recordMetric("email.verification.logged", 1, {
      mode,
    });
    return;
  }

  try {
    // Fresh parse so SMTP edits in .env.production take effect after PM2 restart.
    resetEnvironmentCache();
    const env = getEnvironment();
    await sendVerificationEmail(env, {
      to: email,
      verificationUrl: url,
    });
    getObservability().recordMetric("email.verification.sent", 1, { mode });
  } catch (error) {
    getObservability().captureError(
      error instanceof Error ? error : new Error("SMTP delivery failed."),
      {
        operation: "email.verification.deliver",
        tags: { mode, emailDomain: email.split("@")[1] ?? "unknown" },
      }
    );
    // Token stays valid; registration must still succeed. Operator can resend
    // or temporarily switch to EMAIL_DELIVERY_MODE=log-link.
    console.error(
      `[email:provider] Verification delivery failed for domain ${
        email.split("@")[1] ?? "unknown"
      }: ${sanitizeSmtpError(error)}`
    );
    // Do not log the raw verification URL in production provider mode —
    // operators can resend; fallback log only confirms failure path.
    console.info(
      `[email:fallback-log] verification delivery deferred for domain ${
        email.split("@")[1] ?? "unknown"
      } (token remains valid; user can request resend)`
    );
  }
}

export async function issueEmailVerification(userId: number): Promise<string> {
  const repository = getUserTokenRepository();
  await repository.revokeForUser(userId, "email_verification");

  const token = createOpaqueToken();
  await repository.create({
    userId,
    tokenHash: hashToken(token),
    tokenType: "email_verification",
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS)
      .toISOString()
      .slice(0, 23)
      .replace("T", " "),
  });

  const user = await getUserRepository().findById(userId);
  if (user) {
    // Never block the HTTP response on slow/broken SMTP (avoids nginx 504).
    void deliverVerificationEmail(user.email, token);
  }

  return token;
}

export type VerifyEmailResult =
  | { success: true; userId: number }
  | {
      success: false;
      reason: "invalid" | "expired" | "already_used" | "account_blocked";
    };

export async function verifyEmailToken(
  plainToken: string
): Promise<VerifyEmailResult> {
  const tokenRepository = getUserTokenRepository();
  const tokenHash = hashToken(plainToken);
  const token = await tokenRepository.findValid(
    tokenHash,
    "email_verification"
  );

  if (!token) {
    const existing = await tokenRepository.findByHash(
      tokenHash,
      "email_verification"
    );
    if (!existing) return { success: false, reason: "invalid" };
    if (existing.usedAt) return { success: false, reason: "already_used" };
    return { success: false, reason: "expired" };
  }

  const userRepository = getUserRepository();
  const user = await userRepository.findById(token.userId);
  if (!user || user.status === "deleted" || user.status === "suspended") {
    return { success: false, reason: "account_blocked" };
  }

  await userRepository.activate(user.id);
  await tokenRepository.markUsed(token.id);
  await getAuditRepository().create({
    userId: user.id,
    eventType: "auth.email.verified",
    entityType: "user",
    entityId: String(user.id),
  });

  try {
    const { processAutomaticNewUserPromotions } =
      await import("./promotions-service");
    await processAutomaticNewUserPromotions({ userId: user.id });
  } catch (error) {
    console.error(
      "[verification] automatic promotion grant failed:",
      error instanceof Error ? error.message : error
    );
  }

  return { success: true, userId: user.id };
}

export async function resendEmailVerification(
  email: string
): Promise<string | null> {
  const user = await getUserRepository().findByEmail(email);
  // Deliberately return the same public result for unknown/active accounts.
  if (!user || user.status !== "pending_verification") return null;
  return issueEmailVerification(user.id);
}
