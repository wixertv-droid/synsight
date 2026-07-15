import { DEMO_USER } from "@/lib/demo/user";
import type { Profile } from "@/types/domain";
import type { ProfileInput } from "@/lib/validation/profile";

export interface ProfileRepository {
  findByUserId(userId: number): Promise<Profile | null>;
  update(userId: number, input: ProfileInput): Promise<void>;
}

const memory = globalThis as typeof globalThis & {
  __synsightProfiles?: Map<number, Profile>;
};

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
          onboardingStep: 3,
          onboardingCompletedAt: new Date().toISOString(),
        },
      ],
    ]));
  return {
    async findByUserId(userId: number) {
      return profiles.get(userId) ?? null;
    },
    async update(userId, input) {
      const current = profiles.get(userId);
      if (!current) return;
      profiles.set(userId, {
        ...current,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        company: input.company || null,
        region: input.region,
      });
    },
  };
}
