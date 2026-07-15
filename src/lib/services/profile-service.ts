/**
 * Profile service — read and update user profile data.
 */
import { getAuditRepository, getProfileRepository } from "@/lib/repositories";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { Profile } from "@/types/domain";
import { profileSchema } from "@/lib/validation/profile";
import type { z } from "zod";

export type ProfileUpdateInput = z.infer<typeof profileSchema>;

export async function getProfileForUser(
  user: AuthenticatedUser
): Promise<Profile | null> {
  const userId = Number(user.id);
  if (!Number.isFinite(userId)) return null;

  const profileRepository = getProfileRepository();
  return profileRepository.findByUserId(userId);
}

export function validateProfileInput(
  input: unknown
):
  | { success: true; data: ProfileUpdateInput }
  | { success: false; message: string } {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Ungültige Profildaten.",
    };
  }
  return { success: true, data: parsed.data };
}

export async function updateProfileForUser(
  user: AuthenticatedUser,
  input: ProfileUpdateInput
): Promise<void> {
  const userId = Number(user.id);
  if (!Number.isFinite(userId)) {
    throw new Error("Invalid authenticated user.");
  }
  await getProfileRepository().update(userId, input);
  await getAuditRepository().create({
    userId,
    eventType: "profile.updated",
    entityType: "profile",
    entityId: String(userId),
  });
}
