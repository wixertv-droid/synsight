import { hashPassword } from "@/lib/auth/password";
import { sanitizeSmtpError, sendPasswordResetEmail } from "@/lib/email/smtp";
import { getObservability } from "@/lib/observability";
import {
  getAuditRepository,
  getSessionRepository,
  getUserRepository,
  getUserTokenRepository,
} from "@/lib/repositories";
import { resolveMailAccountRuntime } from "@/lib/services/mail-settings-service";
import { createOpaqueToken, hashToken } from "@/lib/utils/crypto";

const PASSWORD_RESET_TTL_MS = 60 * 60_000;

/**
 * log-link bleibt aus Kompatibilitätsgründen enthalten.
 * Der produktive Admin-SMTP-Betrieb verwendet provider/disabled.
 */
export type PasswordResetDeliveryMode = "provider" | "disabled" | "log-link";

function resolveAppUrl(): string {
  return (
    process.env.APP_URL?.trim().replace(/\/$/, "") || "https://synsight.de"
  );
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

async function currentDeliveryMode(): Promise<PasswordResetDeliveryMode> {
  const runtime = await resolveMailAccountRuntime("system");

  return runtime.enabled ? "provider" : "disabled";
}

async function deliverPasswordResetEmail(
  email: string,
  token: string
): Promise<{
  mode: PasswordResetDeliveryMode;
  delivered: boolean;
}> {
  const runtime = await resolveMailAccountRuntime("system");

  const url = buildResetUrl(token);

  if (!runtime.enabled) {
    return {
      mode: "disabled",
      delivered: false,
    };
  }

  if (!runtime.config) {
    console.error(
      `[email:provider] System-SMTP für Passwort-Reset nicht verfügbar: ${
        runtime.error ?? "unknown error"
      }`
    );

    return {
      mode: "provider",
      delivered: false,
    };
  }

  try {
    await sendPasswordResetEmail(runtime.config, {
      to: email,
      resetUrl: url,
    });

    getObservability().recordMetric("email.password_reset.sent", 1, {
      mode: "provider",
    });

    return {
      mode: "provider",
      delivered: true,
    };
  } catch (error) {
    getObservability().captureError(
      error instanceof Error ? error : new Error("SMTP delivery failed."),
      {
        operation: "email.password_reset.deliver",
        tags: {
          mode: "provider",
          emailDomain: email.split("@")[1] ?? "unknown",
        },
      }
    );

    console.error(
      `[email:provider] Password-reset delivery failed for domain ${
        email.split("@")[1] ?? "unknown"
      }: ${sanitizeSmtpError(error)}`
    );

    return {
      mode: "provider",
      delivered: false,
    };
  }
}

export interface RequestPasswordResetResult {
  token: string | null;
  deliveryMode: PasswordResetDeliveryMode;
  delivered: boolean;
}

export async function requestPasswordReset(
  email: string
): Promise<RequestPasswordResetResult> {
  const normalized = email.trim().toLowerCase();
  const mode = await currentDeliveryMode();

  const user = await getUserRepository().findByEmail(normalized);

  if (!user || user.status === "deleted" || user.status === "suspended") {
    return {
      token: null,
      deliveryMode: mode,
      delivered: false,
    };
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
    metadata: {
      deliveryMode: mode,
    },
  });

  const delivery = await deliverPasswordResetEmail(user.email, token);

  return {
    token,
    deliveryMode: delivery.mode,
    delivered: delivery.delivered,
  };
}

export type ResetPasswordResult =
  | {
      success: true;
    }
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

    if (!existing) {
      return {
        success: false,
        reason: "invalid",
      };
    }

    if (existing.usedAt) {
      return {
        success: false,
        reason: "already_used",
      };
    }

    return {
      success: false,
      reason: "expired",
    };
  }

  const userRepository = getUserRepository();

  const user = await userRepository.findById(token.userId);

  if (!user || user.status === "deleted" || user.status === "suspended") {
    return {
      success: false,
      reason: "account_blocked",
    };
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
    metadata: {
      via: "password_reset",
    },
  });

  return {
    success: true,
  };
}
