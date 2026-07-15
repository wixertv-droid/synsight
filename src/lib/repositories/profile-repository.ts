import { DEMO_USER } from "@/lib/demo/user";
import type { Profile } from "@/types/domain";
import type { ProfileInput } from "@/lib/validation/profile";

export interface ProfileRepository {
  findByUserId(userId: number): Promise<Profile | null>;
  ensureDraft(userId: number, seed?: Partial<Profile>): Promise<Profile>;
  update(userId: number, input: ProfileInput): Promise<void>;
  markOnboardingComplete(
    userId: number,
    patch: Partial<Profile>
  ): Promise<void>;
}

export function isOnboardingComplete(
  profile: Profile | null | undefined
): boolean {
  if (!profile) return false;
  return Boolean(profile.onboardingCompletedAt) || profile.onboardingStep >= 4;
}

const memory = globalThis as typeof globalThis & {
  __synsightProfiles?: Map<number, Profile>;
};

function createDraftProfile(
  userId: number,
  seed: Partial<Profile> = {}
): Profile {
  return {
    userId,
    firstName: seed.firstName ?? "",
    lastName: seed.lastName ?? "",
    phone: seed.phone ?? null,
    company: seed.company ?? null,
    region: seed.region ?? "EU",
    locale: seed.locale ?? "de-DE",
    publicAlias: seed.publicAlias ?? null,
    onboardingStep: seed.onboardingStep ?? 0,
    onboardingCompletedAt: seed.onboardingCompletedAt ?? null,
  };
}

export function createInMemoryProfileRepository(): ProfileRepository {
  const profiles: Map<number, Profile> =
    memory.__synsightProfiles ??
    (memory.__synsightProfiles = new Map<number, Profile>([
      [
        1,
        {
          userId: 1,
          firstName: "Alex",
          lastName: "Morgan",
          phone: null,
          company: null,
          region: "EU",
          locale: "de-DE",
          publicAlias: DEMO_USER.displayName,
          onboardingStep: 4,
          onboardingCompletedAt: new Date().toISOString(),
        },
      ],
    ]));

  return {
    async findByUserId(userId: number) {
      return profiles.get(userId) ?? null;
    },

    async ensureDraft(userId, seed = {}) {
      const existing = profiles.get(userId);
      if (existing) return existing;
      const draft = createDraftProfile(userId, seed);
      profiles.set(userId, draft);
      return draft;
    },

    async update(userId, input) {
      const current =
        profiles.get(userId) ??
        createDraftProfile(userId, {
          firstName: input.firstName,
          lastName: input.lastName,
        });
      profiles.set(userId, {
        ...current,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        company: input.company || null,
        region: input.region,
      });
    },

    async markOnboardingComplete(userId, patch) {
      const current = profiles.get(userId) ?? createDraftProfile(userId);
      profiles.set(userId, {
        ...current,
        ...patch,
        onboardingStep: 4,
        onboardingCompletedAt:
          patch.onboardingCompletedAt ?? new Date().toISOString(),
      });
    },
  };
}
