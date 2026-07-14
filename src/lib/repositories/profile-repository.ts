import { DEMO_USER } from "@/lib/demo/user";
import type { Profile } from "@/types/domain";

export interface ProfileRepository {
  findByUserId(userId: number): Promise<Profile | null>;
}

export function createInMemoryProfileRepository(): ProfileRepository {
  return {
    async findByUserId(userId: number) {
      if (userId !== 1) return null;

      return {
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
      };
    },
  };
}
