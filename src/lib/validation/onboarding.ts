import { z } from "zod";

/**
 * Prepared onboarding validation schemas.
 *
 * These are not yet wired into `OnboardingFlow` (no persistence exists
 * yet), but they define the exact shape a future `/api/onboarding` route
 * must accept so the client and server agree on validation rules from day
 * one.
 */

export const onboardingIdentityStepSchema = z.object({
  fullName: z.string().min(1, "Bitte geben Sie Ihren vollständigen Namen ein."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  region: z.string().min(1, "Bitte wählen Sie ein Land oder eine Region aus."),
  alias: z.string().optional(),
});

export const onboardingSourcesStepSchema = z.object({
  emailAddresses: z.boolean(),
  usernames: z.boolean(),
  webMentions: z.boolean(),
  knownDomains: z.boolean(),
});

export const onboardingPreferencesStepSchema = z.object({
  continuousMonitoring: z.boolean(),
  criticalAlerts: z.boolean(),
  monthlySummary: z.boolean(),
  aiRecommendations: z.boolean(),
});

export type OnboardingIdentityInput = z.infer<
  typeof onboardingIdentityStepSchema
>;
export type OnboardingSourcesInput = z.infer<
  typeof onboardingSourcesStepSchema
>;
export type OnboardingPreferencesInput = z.infer<
  typeof onboardingPreferencesStepSchema
>;
