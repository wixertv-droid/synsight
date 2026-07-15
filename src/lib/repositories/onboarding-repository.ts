import type { OnboardingPayload } from "@/lib/validation/onboarding";

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
  return {
    async save(userId, payload) {
      records.set(userId, structuredClone(payload));
    },
  };
}
