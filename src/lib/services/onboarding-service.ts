import {
  getAuditRepository,
  getOnboardingRepository,
} from "@/lib/repositories";
import {
  onboardingPayloadSchema,
  type OnboardingPayload,
} from "@/lib/validation/onboarding";

export function validateOnboardingPayload(
  input: unknown
):
  | { success: true; data: OnboardingPayload }
  | { success: false; message: string } {
  const parsed = onboardingPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Bitte überprüfen Sie Ihre Angaben.",
    };
  }
  return { success: true, data: parsed.data };
}

export async function completeOnboarding(
  userId: number,
  payload: OnboardingPayload
): Promise<void> {
  await getOnboardingRepository().save(userId, payload);
  await getAuditRepository().create({
    userId,
    eventType: "profile.updated",
    entityType: "onboarding",
    entityId: String(userId),
    metadata: { completedStep: 4 },
  });
}
