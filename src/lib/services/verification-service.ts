import {
  getAuditRepository,
  getUserRepository,
  getUserTokenRepository,
} from "@/lib/repositories";
import { createOpaqueToken, hashToken } from "@/lib/utils/crypto";

const VERIFICATION_TTL_MS = 24 * 60 * 60_000;

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
  return token;
}

export async function verifyEmailToken(
  plainToken: string
): Promise<{ success: true; userId: number } | { success: false }> {
  const tokenRepository = getUserTokenRepository();
  const token = await tokenRepository.findValid(
    hashToken(plainToken),
    "email_verification"
  );
  if (!token) return { success: false };

  const userRepository = getUserRepository();
  const user = await userRepository.findById(token.userId);
  if (!user || user.status === "deleted" || user.status === "suspended") {
    return { success: false };
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
