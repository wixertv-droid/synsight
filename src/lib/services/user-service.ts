/**
 * User service — business logic for user identity lookups.
 */
import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/database/client";
import { DEMO_USER } from "@/lib/demo/user";
import { getProfileRepository, getUserRepository } from "@/lib/repositories";
import { toDisplayName } from "@/lib/repositories/user-repository";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { Profile } from "@/types/domain";

export interface UserProfileView {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  company: string | null;
  region: string;
  locale: string;
  plan: string;
  activeNode: string;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  return getCurrentUser();
}

export async function getUserProfile(
  user: AuthenticatedUser
): Promise<UserProfileView> {
  const userId = Number(user.id);
  const profileRepository = getProfileRepository();
  const profile = Number.isFinite(userId)
    ? await profileRepository.findByUserId(userId)
    : null;

  return mapProfileView(user, profile);
}

function mapProfileView(
  user: AuthenticatedUser,
  profile: Profile | null
): UserProfileView {
  const firstName = profile?.firstName ?? user.displayName.split(" ")[0] ?? "User";
  const lastName =
    profile?.lastName ?? user.displayName.split(" ").slice(1).join(" ") ?? "";

  return {
    id: user.id,
    email: user.email,
    displayName: profile
      ? toDisplayName({
          firstName: profile.firstName,
          lastName: profile.lastName,
          username: user.email,
        })
      : user.displayName,
    firstName,
    lastName,
    phone: profile?.phone ?? null,
    company: profile?.company ?? null,
    region: profile?.region ?? "EU",
    locale: profile?.locale ?? "de-DE",
    plan: DEMO_USER.plan,
    activeNode: DEMO_USER.activeNode,
  };
}

export async function getUserById(id: number) {
  const userRepository = getUserRepository();
  return userRepository.findById(id);
}

export function isUsingDatabase(): boolean {
  return isDatabaseConfigured();
}
