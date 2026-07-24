import type { OnboardingPayload } from "@/lib/validation/onboarding";
import { createInMemoryProfileRepository } from "./profile-repository";

export interface OnboardingRepository {
  save(userId: number, payload: OnboardingPayload): Promise<void>;
}

const memory = globalThis as typeof globalThis & {
  __synsightOnboarding?: Map<number, OnboardingPayload>;
};

export function createInMemoryOnboardingRepository(): OnboardingRepository {
  const records =
    memory.__synsightOnboarding ??
    (memory.__synsightOnboarding = new Map<number, OnboardingPayload>());
  const profiles = createInMemoryProfileRepository();

  return {
    async save(userId, payload) {
      records.set(userId, structuredClone(payload));
      const company = payload.additionalData.companies[0] ?? null;
      await profiles.markOnboardingComplete(userId, {
        firstName: payload.identity.firstName,
        lastName: payload.identity.lastName,
        publicAlias: payload.identity.publicAlias || null,
        phone: payload.identity.phoneNumbers[0] || null,
        company,
        location: payload.identity.city || null,
        region: payload.identity.country || "EU",
      });
    },
  };
}
