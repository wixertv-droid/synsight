import { hashPassword } from "@/lib/auth/password";
import { getEnvironment, resetEnvironmentCache } from "@/lib/config/env";
import { sanitizeSmtpError, sendPasswordResetEmail } from "@/lib/email/smtp";
import { getObservability } from "@/lib/observability";
import {
  getAuditRepository,
  getSessionRepository,
  getUserRepository,
  getUserTokenRepository,
} from "@/lib/repositories";
import { createOpaqueToken, hashToken } from "@/lib/utils/crypto";

const PASSWORD_RESET_TTL_MS = 60 * 60_000;

export type PasswordResetDeliveryMode = "provider" | "log-link" | "disabled";

function resolveAppUrl(): string {
  const fromProcess = process.env.APP_URL?.trim();
  if (fromProcess) return fromProcess.replace(/\/$/, "");

  try {
    return getEnvironment().APP_URL.replace(/\/$/, "");
  } catch {
    return "https://synsight.de";
  }
}

function buildResetUrl(token: string): string {
  return `${resolveAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

function formatExpiresAt(ttlMs: number): string {
  return new Date(Date.now() + ttlMs)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");
}

function deliveryMode(): PasswordResetDeliveryMode {
  const mode = (process.env.EMAIL_DELIVERY_MODE ?? "log-link")
    .trim()
    .toLowerCase();
  if (mode === "provider" || mode === "disabled" || mode === "log-link") {
    return mode;
  }
  return "log-link";
}

async function deliverPasswordResetEmail(
  email: string,
  token: string
): Promise<{ mode: PasswordResetDeliveryMode; delivered: boolean }> {
  const mode = deliveryMode();
  const url = buildResetUrl(token);

  if (mode === "disabled") {
    return { mode, delivered: false };
  }

  if (mode === "log-link") {
    console.info(`[email:log-link] password-reset for ${email}: ${url}`);
    getObservability().recordMetric("email.password_reset.logged", 1, {
      mode,
    });
    return { mode, delivered: true };
  }

  try {
    resetEnvironmentCache();
    const env = getEnvironment();
    await sendPasswordResetEmail(env, {
      to: email,
      resetUrl: url,
    });
    getObservability().recordMetric("email.password_reset.sent", 1, { mode });
    return { mode, delivered: true };
  } catch (error) {
    getObservability().captureError(
      error instanceof Error ? error : new Error("SMTP delivery failed."),
      {
        operation: "email.password_reset.deliver",
        tags: { mode, emailDomain: email.split("@")[1] ?? "unknown" },
      }
    );
    console.error(
      `[email:provider] Password-reset delivery failed for domain ${
        email.split("@")[1] ?? "unknown"
      }: ${sanitizeSmtpError(error)}`
    );
    // Keep token valid; fall back to log so ops can recover the link.
    console.info(`[email:fallback-log] password-reset for ${email}: ${url}`);
    return { mode, delivered: false };
  }
}

export interface RequestPasswordResetResult {
  /** Opaque token — only expose in log-link / non-production. */
  token: string | null;
  deliveryMode: PasswordResetDeliveryMode;
  /** True when a mail was queued/sent or a log-link was written. */
  delivered: boolean;
}

/**
 * Issues a password-reset token for an eligible account.
 * Never reveals whether the email exists (token stays null for unknowns).
 */
export async function requestPasswordReset(
  email: string
): Promise<RequestPasswordResetResult> {
  const normalized = email.trim().toLowerCase();
  const mode = deliveryMode();
  const user = await getUserRepository().findByEmail(normalized);
  if (!user || user.status === "deleted" || user.status === "suspended") {
    return { token: null, deliveryMode: mode, delivered: false };
  }

  const tokenRepository = getUserTokenRepository();
  await tokenRepository.revokeForUser(user.id, "password_reset");

  const token = createOpaqueToken();
  await tokenRepository.create({
    userId: user.id,
    tokenHash: hashToken(token),
    tokenType: "password_reset",
    expiresAt: formatExpiresAt(PASSWORD_RESET_TTL_MS),
  });

  await getAuditRepository().create({
    userId: user.id,
    eventType: "auth.password_reset.requested",
    entityType: "user",
    entityId: String(user.id),
    metadata: { deliveryMode: mode },
  });

  // Await delivery so SMTP/config failures surface in logs before the response.
  const delivery = await deliverPasswordResetEmail(user.email, token);
  return {
    token,
    deliveryMode: delivery.mode,
    delivered: delivery.delivered,
  };
}

export type ResetPasswordResult =
  | { success: true }
  | {
      success: false;
      reason: "invalid" | "expired" | "already_used" | "account_blocked";
    };

export async function resetPasswordWithToken(
  plainToken: string,
  password: string
): Promise<ResetPasswordResult> {
  const tokenRepository = getUserTokenRepository();
  const tokenHash = hashToken(plainToken);
  const token = await tokenRepository.findValid(tokenHash, "password_reset");

  if (!token) {
    const existing = await tokenRepository.findByHash(
      tokenHash,
      "password_reset"
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

  await userRepository.updatePasswordHash(
    user.id,
    await hashPassword(password)
  );
  await userRepository.clearFailedLogins(user.id);
  await tokenRepository.markUsed(token.id);
  await tokenRepository.revokeForUser(user.id, "password_reset");
  await getSessionRepository().revokeAllForUser(user.id);

  await getAuditRepository().create({
    userId: user.id,
    eventType: "auth.password.changed",
    entityType: "user",
    entityId: String(user.id),
    metadata: { via: "password_reset" },
  });

  return { success: true };
}
