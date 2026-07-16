import {
  getAuditRepository,
  getUserRepository,
  getUserTokenRepository,
} from "@/lib/repositories";
import { createOpaqueToken, hashToken } from "@/lib/utils/crypto";
import { getEnvironment } from "@/lib/config/env";
import { getObservability } from "@/lib/observability";

const VERIFICATION_TTL_MS = 24 * 60 * 60_000;

function buildVerificationUrl(token: string): string {
  const appUrl = getEnvironment().APP_URL.replace(/\/$/, "");
  return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

async function deliverVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const mode = getEnvironment().EMAIL_DELIVERY_MODE;
  const url = buildVerificationUrl(token);

  if (mode === "disabled") {
    return;
  }

  if (mode === "log-link") {
    // Intentionally avoid logging the raw token alone; URL is for local/dev use.
    console.info(`[email:log-link] verification for ${email}: ${url}`);
    getObservability().recordMetric("email.verification.logged", 1, {
      mode,
    });
    return;
  }

  // Provider mode: seam for a future outbound mail adapter.
  getObservability().captureError(
    new Error("EMAIL_DELIVERY_MODE=provider is not configured yet."),
    {
      operation: "email.verification.deliver",
      tags: { mode, emailDomain: email.split("@")[1] ?? "unknown" },
    }
  );
  console.warn(
    `[email:provider] Delivery adapter not configured. Verification prepared for ${email}.`
  );
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
    await deliverVerificationEmail(user.email, token);
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
