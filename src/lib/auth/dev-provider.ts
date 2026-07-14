/**
 * DEVELOPMENT ONLY authentication provider.
 *
 * Validates the fixed `admin` / `admin` credential pair defined in
 * `lib/auth/config.ts` and resolves the matching identity through
 * `UserRepository`. This exists solely so the protected platform routes can
 * be reviewed before a real identity provider and database are connected.
 *
 * Replace this file before production launch with a provider that checks
 * hashed passwords (Argon2id) against `users.password_hash` and enforces
 * lockouts/rate limiting. `lib/services/auth-service.ts` is the only caller
 * of this module, so swapping providers never requires touching route
 * handlers or UI components.
 */
import { DEV_AUTH_PASSWORD, DEV_AUTH_USERNAME } from "./config";
import { getUserRepository } from "@/lib/repositories";
import { toDisplayName } from "@/lib/repositories/user-repository";
import type { AuthenticatedUser } from "./types";

export async function authenticateWithDevCredentials(
  identifier: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const isDevCredential =
    identifier.trim().toLowerCase() === DEV_AUTH_USERNAME &&
    password === DEV_AUTH_PASSWORD;

  if (!isDevCredential) return null;

  const userRepository = getUserRepository();
  const record = await userRepository.findByUsername(identifier);
  if (!record) return null;

  return {
    id: String(record.id),
    displayName: toDisplayName(record),
    email: record.email,
    role: record.role,
  } satisfies AuthenticatedUser;
}
