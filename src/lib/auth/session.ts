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
import type { AuthenticatedUser } from "./types";

export async function createSession(user: AuthenticatedUser): Promise<string> {
  const token = await createSessionToken(
    {
      sub: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    },
    SESSION_MAX_AGE_SECONDS
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    displayName: payload.displayName,
    email: payload.email,
    role: payload.role,
  };
});
