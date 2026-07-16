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
import { createUserTokenRepository } from "./mysql/user-token-repository";
import { createAuditRepository } from "./mysql/audit-repository";
import { createOnboardingRepository } from "./mysql/onboarding-repository";
import { createIdentityRepository } from "./mysql/identity-repository";
import type { AuditRepository } from "./audit-repository";
import type { ProfileRepository } from "./profile-repository";
import type { SecurityRepository } from "./security-repository";
import type { SessionRepository } from "./session-repository";
import type { UserRepository } from "./user-repository";
import type { UserTokenRepository } from "./user-token-repository";
import type { OnboardingRepository } from "./onboarding-repository";
import type { IdentityRepository } from "./identity-repository";

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

export function getUserTokenRepository(): UserTokenRepository {
  return createUserTokenRepository(getDatabase());
}

export function getAuditRepository(): AuditRepository {
  return createAuditRepository(getDatabase());
}

export function getOnboardingRepository(): OnboardingRepository {
  return createOnboardingRepository(getDatabase());
}

export function getIdentityRepository(): IdentityRepository {
  return createIdentityRepository(getDatabase());
}
