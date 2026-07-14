/**
 * Repository factory — returns MySQL-backed or in-memory implementations
 * depending on whether `DATABASE_URL` is configured.
 *
 * All data access must go through these factories. API routes and services
 * must never import Drizzle or `mysql2` directly.
 */
import { getDatabase } from "@/lib/database/client";
import { createProfileRepository } from "./mysql/profile-repository";
import { createSecurityRepository } from "./mysql/security-repository";
import { createSessionRepository } from "./mysql/session-repository";
import { createUserRepository } from "./mysql/user-repository";
import type { ProfileRepository } from "./profile-repository";
import type { SecurityRepository } from "./security-repository";
import type { SessionRepository } from "./session-repository";
import type { UserRepository } from "./user-repository";

export function getUserRepository(): UserRepository {
  return createUserRepository(getDatabase());
}

export function getSessionRepository(): SessionRepository {
  return createSessionRepository(getDatabase());
}

export function getProfileRepository(): ProfileRepository {
  return createProfileRepository(getDatabase());
}

export function getSecurityRepository(): SecurityRepository {
  return createSecurityRepository(getDatabase());
}
