/**
 * Application-level authentication service.
 *
 * Route Handlers call this layer instead of talking to repositories or
 * `session.ts` directly. Credentials are always verified with Argon2id;
 * repositories transparently select MySQL or the local development store.
 */
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  destroySession,
  getSessionToken,
} from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/session-token";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/config";
import {
  getAuditRepository,
  getSessionRepository,
  getUserRepository,
  getProfileRepository,
  getSecurityRepository,
} from "@/lib/repositories";
import { findUserByIdentifier } from "@/lib/repositories/mysql/user-repository";
import { toDisplayName } from "@/lib/repositories/user-repository";
import { createSessionId, hashToken } from "@/lib/utils/crypto";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { UserRecord } from "@/lib/repositories/user-repository";
import type { RegisterInput } from "@/lib/validation/auth";
import { isAutoVerifyEmailEnabled } from "@/lib/config/env";
import { issueEmailVerification } from "./verification-service";

function toAuthenticatedUser(record: UserRecord): AuthenticatedUser {
  return {
    id: String(record.id),
    displayName: toDisplayName(record),
    email: record.email,
    role: record.role,
  };
}

export type LoginResult =
  | { status: "success"; user: AuthenticatedUser }
  | { status: "invalid" | "locked" | "verification_required" };

export type RegistrationResult =
  | {
      status: "created";
      email: string;
      verificationToken: string;
      autoVerified: boolean;
    }
  | { status: "email_exists" }
  | { status: "reserved_username" };

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "synsight",
  "support",
  "security",
]);

async function createAuthenticatedSession(
  record: UserRecord,
  requestMeta?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<AuthenticatedUser> {
  const authUser = toAuthenticatedUser(record);
  const sessionId = createSessionId();
  const token = await createSession(authUser, sessionId);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");

  await getSessionRepository().create({
    id: sessionId,
    userId: record.id,
    tokenHash: hashToken(token),
    ipAddress: requestMeta?.ipAddress ?? null,
    userAgent: requestMeta?.userAgent ?? null,
    expiresAt,
  });
  return authUser;
}

export async function loginWithCredentials(
  identifier: string,
  password: string,
  requestMeta?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<LoginResult> {
  const userRepository = getUserRepository();
  const record = await findUserByIdentifier(userRepository, identifier);

  if (!record) {
    await getAuditRepository().create({
      eventType: "auth.login.failed",
      ipAddress: requestMeta?.ipAddress,
      metadata: { reason: "invalid_credentials" },
    });
    return { status: "invalid" };
  }

  if (
    record.lockedUntil &&
    new Date(record.lockedUntil).getTime() > Date.now()
  ) {
    return { status: "locked" };
  }

  if (record.status === "pending_verification") {
    return { status: "verification_required" };
  }
  if (record.status !== "active") {
    return { status: "invalid" };
  }

  const passwordValid = await verifyPassword(record.passwordHash, password);
  if (!passwordValid) {
    const attempts = record.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= 5
        ? new Date(Date.now() + 15 * 60_000)
            .toISOString()
            .slice(0, 23)
            .replace("T", " ")
        : null;
    await userRepository.recordFailedLogin(record.id, lockedUntil);
    await getAuditRepository().create({
      userId: record.id,
      eventType: "auth.login.failed",
      ipAddress: requestMeta?.ipAddress,
      metadata: {
        reason: "invalid_credentials",
        accountLocked: Boolean(lockedUntil),
      },
    });
    return { status: lockedUntil ? "locked" : "invalid" };
  }

  await userRepository.clearFailedLogins(record.id);
  await userRepository.updateLastLogin(record.id);
  const user = await createAuthenticatedSession(record, requestMeta);
  await getAuditRepository().create({
    userId: record.id,
    eventType: "auth.login.succeeded",
    ipAddress: requestMeta?.ipAddress,
  });
  return { status: "success", user };
}

export async function registerUser(
  input: RegisterInput,
  requestMeta?: { ipAddress?: string | null }
): Promise<RegistrationResult> {
  const repository = getUserRepository();
  if (await repository.findByEmail(input.email)) {
    return { status: "email_exists" };
  }

  const localPart =
    input.email
      .split("@")[0]
      ?.replace(/[^a-z0-9._-]/gi, "")
      .toLowerCase() || "user";

  if (RESERVED_USERNAMES.has(localPart)) {
    return { status: "reserved_username" };
  }

  let username = localPart;
  if (await repository.findByUsername(username)) {
    username = `${localPart}-${createSessionId().slice(0, 8)}`;
  }

  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return { status: "reserved_username" };
  }

  const user = await repository.create({
    email: input.email,
    username,
    passwordHash: await hashPassword(input.password),
    firstName: input.firstName,
    lastName: input.lastName,
  });
  await getProfileRepository().ensureDraft(user.id, {
    firstName: input.firstName,
    lastName: input.lastName,
    onboardingStep: 0,
  });
  await getSecurityRepository().upsertPreferences(user.id, {
    monitoringEnabled: Boolean(input.monitoringOptIn),
    consentMonitoringAt: input.monitoringOptIn
      ? new Date().toISOString().slice(0, 23).replace("T", " ")
      : null,
  });
  const autoVerified = isAutoVerifyEmailEnabled();
  let verificationToken = "";
  if (autoVerified) {
    await repository.activate(user.id);
  } else {
    try {
      verificationToken = await issueEmailVerification(user.id);
    } catch (error) {
      // Account + profile already exist. Never fail the whole registration
      // because outbound mail or token delivery misbehaved.
      console.error(
        "[auth.registration] verification step failed:",
        error instanceof Error ? error.message : error
      );
    }
  }
  await getAuditRepository().create({
    userId: user.id,
    eventType: "auth.registration",
    entityType: "user",
    entityId: String(user.id),
    ipAddress: requestMeta?.ipAddress,
  });
  return {
    status: "created",
    email: user.email,
    verificationToken,
    autoVerified,
  };
}

export async function logout(): Promise<void> {
  const token = await getSessionToken();
  const payload = await verifySessionToken(token);
  if (payload) {
    await getSessionRepository().revoke(payload.sid);
    await getAuditRepository().create({
      userId: Number(payload.sub) || null,
      eventType: "auth.logout",
    });
  }
  await destroySession();
}
