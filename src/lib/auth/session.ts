/**
 * Server-only session helpers built on top of `next/headers` cookies and
 * the signed tokens from `session-token.ts`.
 *
 * `createSession` / `destroySession` mutate the response and may only be
 * called from Route Handlers or Server Actions. `getCurrentUser` is safe to
 * call from Server Components and is wrapped in React's `cache()` so a
 * single request (e.g. a platform layout plus its page) only verifies the
 * cookie once.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./config";
import { createSessionToken, verifySessionToken } from "./session-token";
import { getSessionRepository, getUserRepository } from "@/lib/repositories";
import { toDisplayName } from "@/lib/repositories/user-repository";
import { isSecureCookieRequired } from "@/lib/security/https";
import { hashToken } from "@/lib/utils/crypto";
import type { AuthenticatedUser } from "./types";

export async function createSession(
  user: AuthenticatedUser,
  sessionId: string
): Promise<string> {
  const token = await createSessionToken(
    {
      sub: user.id,
      sid: sessionId,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    },
    SESSION_MAX_AGE_SECONDS
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookieRequired(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureCookieRequired(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const token = await getSessionToken();
    const payload = await verifySessionToken(token);
    if (!payload) return null;

    if (token) {
      const sessionRepository = getSessionRepository();
      const session = await sessionRepository.findActiveByTokenHash(
        hashToken(token)
      );
      if (!session || session.id !== payload.sid) return null;

      const user = await getUserRepository().findById(session.userId);
      if (!user || user.status !== "active") return null;
      await sessionRepository.touch(session.id);
      return {
        id: String(user.id),
        displayName: toDisplayName(user),
        email: user.email,
        role: user.role,
      };
    }

    return {
      id: payload.sub,
      displayName: payload.displayName,
      email: payload.email,
      role: payload.role,
    };
  }
);
