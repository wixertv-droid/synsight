/**
 * Application-level authentication service.
 *
 * Route Handlers call this layer instead of talking to repositories or
 * `session.ts` directly. When `DATABASE_URL` is set, credentials are
 * verified against Argon2id hashes in MySQL; otherwise the development
 * fallback in `dev-provider.ts` is used.
 */
import { DEV_AUTH_PASSWORD, DEV_AUTH_USERNAME } from "@/lib/auth/config";
import { authenticateWithDevCredentials } from "@/lib/auth/dev-provider";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/config";
import { isDatabaseConfigured } from "@/lib/database/client";
import {
  getSessionRepository,
  getUserRepository,
} from "@/lib/repositories";
import {
  findUserByIdentifier,
} from "@/lib/repositories/mysql/user-repository";
import {
  toDisplayName,
} from "@/lib/repositories/user-repository";
import { createSessionId, hashToken } from "@/lib/utils/crypto";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { UserRecord } from "@/lib/repositories/user-repository";

function toAuthenticatedUser(record: UserRecord): AuthenticatedUser {
  return {
    id: String(record.id),
    displayName: toDisplayName(record),
    email: record.email,
    role: record.role,
  };
}

async function loginWithDatabase(
  identifier: string,
  password: string,
  requestMeta?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<AuthenticatedUser | null> {
  const userRepository = getUserRepository();
  const record = await findUserByIdentifier(userRepository, identifier);

  if (!record || record.status !== "active") {
    return null;
  }

  const passwordValid = await verifyPassword(record.passwordHash, password);
  if (!passwordValid) {
    return null;
  }

  await userRepository.updateLastLogin(record.id);

  const authUser = toAuthenticatedUser(record);
  const token = await createSession(authUser);

  const sessionRepository = getSessionRepository();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");

  await sessionRepository.create({
    id: createSessionId(),
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
): Promise<AuthenticatedUser | null> {
  if (isDatabaseConfigured()) {
    return loginWithDatabase(identifier, password, requestMeta);
  }

  const user = await authenticateWithDevCredentials(identifier, password);
  if (!user) return null;

  await createSession(user);
  return user;
}

/**
 * DEVELOPMENT ONLY: creates a session for a freshly "registered" identity
 * without persisting anything. A real implementation must create a user
 * row, hash the password, send a verification email, and only issue a
 * session once the account is confirmed.
 */
export async function registerDevUser(user: AuthenticatedUser): Promise<void> {
  await createSession(user);
}

export async function logout(): Promise<void> {
  await destroySession();
}

export function getDevCredentialsHint(): { username: string; password: string } {
  return {
    username: DEV_AUTH_USERNAME,
    password: DEV_AUTH_PASSWORD,
  };
}
