import {
  getAuditRepository,
  getUserRepository,
  getUserTokenRepository,
} from "@/lib/repositories";
import { createOpaqueToken, hashToken } from "@/lib/utils/crypto";
import { getObservability } from "@/lib/observability";
import { sanitizeSmtpError, sendVerificationEmail } from "@/lib/email/smtp";
import { resolveMailAccountRuntime } from "@/lib/services/mail-settings-service";

const VERIFICATION_TTL_MS = 24 * 60 * 60_000;

function resolveAppUrl(): string {
  return (
    process.env.APP_URL?.trim().replace(/\/$/, "") || "https://synsight.de"
  );
}

function buildVerificationUrl(token: string): string {
  return `${resolveAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

async function deliverVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const url = buildVerificationUrl(token);
  const runtime = await resolveMailAccountRuntime("system");

  if (!runtime.enabled) {
    console.info(
      `[email:disabled] verification for domain ${
        email.split("@")[1] ?? "unknown"
      }`
    );
    return;
  }

  if (!runtime.config) {
    console.error(
      `[email:provider] System-SMTP für Verifizierung nicht verfügbar: ${
        runtime.error ?? "unknown error"
      }`
    );
    return;
  }

  try {
    await sendVerificationEmail(runtime.config, {
      to: email,
      verificationUrl: url,
    });

    getObservability().recordMetric("email.verification.sent", 1, {
      mode: "provider",
    });
  } catch (error) {
    getObservability().captureError(
      error instanceof Error ? error : new Error("SMTP delivery failed."),
      {
        operation: "email.verification.deliver",
        tags: {
          mode: "provider",
          emailDomain: email.split("@")[1] ?? "unknown",
        },
      }
    );

    console.error(
      `[email:provider] Verification delivery failed for domain ${
        email.split("@")[1] ?? "unknown"
      }: ${sanitizeSmtpError(error)}`
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
    // Registrierung soll nicht auf langsames SMTP warten.
    void deliverVerificationEmail(user.email, token);
  }

  return token;
}

export type VerifyEmailResult =
  | {
      success: true;
      userId: number;
    }
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

    if (!existing) {
      return { success: false, reason: "invalid" };
    }

    if (existing.usedAt) {
      return { success: false, reason: "already_used" };
    }

    return { success: false, reason: "expired" };
  }

  const userRepository = getUserRepository();
  const user = await userRepository.findById(token.userId);

  if (!user || user.status === "deleted" || user.status === "suspended") {
    return {
      success: false,
      reason: "account_blocked",
    };
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

    await processAutomaticNewUserPromotions({
      userId: user.id,
    });
  } catch (error) {
    console.error(
      "[verification] automatic promotion grant failed:",
      error instanceof Error ? error.message : error
    );
  }

  return {
    success: true,
    userId: user.id,
  };
}

export async function resendEmailVerification(
  email: string
): Promise<string | null> {
  const user = await getUserRepository().findByEmail(email);

  // Gleiche öffentliche Antwort bei unbekannten oder bereits aktiven Konten.
  if (!user || user.status !== "pending_verification") {
    return null;
  }

  return issueEmailVerification(user.id);
}
