import { z } from "zod";

export const onboardingIdentityStepSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  publicAlias: z.string().trim().max(100).optional().default(""),
  formerNames: z.array(z.string().trim().min(1).max(150)).max(20).default([]),
  nicknames: z.array(z.string().trim().min(1).max(150)).max(20).default([]),
  city: z.string().trim().max(100).optional().default(""),
  country: z.string().trim().max(100).optional().default(""),
  phoneNumbers: z.array(z.string().trim().min(5).max(32)).max(10).default([]),
  additionalEmails: z
    .array(z.string().trim().toLowerCase().email())
    .max(10)
    .default([]),
});

export const socialPlatformSchema = z.enum([
  "Instagram",
  "Facebook",
  "LinkedIn",
  "TikTok",
  "YouTube",
  "X",
  "GitHub",
  "Reddit",
  "Pinterest",
  "Discord",
  "Telegram",
  "Threads",
  "Twitch",
]);

export const socialAccountSchema = z.object({
  platform: socialPlatformSchema,
  username: z.string().trim().min(1).max(150),
  profileUrl: z
    .union([z.literal(""), z.string().trim().url().max(500)])
    .default(""),
});

export const onboardingDigitalIdentityStepSchema = z.object({
  socialAccounts: z.array(socialAccountSchema).max(30).default([]),
});

/** Accept bare domains/hosts and normalize to https:// URLs. */
const flexibleUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .transform((value) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`
  )
  .pipe(z.string().url().max(500));

export const onboardingAdditionalDataStepSchema = z.object({
  oldUsernames: z.array(z.string().trim().min(1).max(150)).max(30).default([]),
  gamingNames: z.array(z.string().trim().min(1).max(150)).max(30).default([]),
  websites: z.array(flexibleUrlSchema).max(20).default([]),
  domains: z.array(z.string().trim().min(3).max(255)).max(20).default([]),
  companies: z.array(z.string().trim().min(1).max(150)).max(20).default([]),
  publicProfiles: z.array(flexibleUrlSchema).max(20).default([]),
});

export const onboardingImageStepSchema = z.object({
  images: z
    .array(
      z.object({
        imageType: z.enum(["front", "left_profile", "right_profile", "angled"]),
        storagePath: z.string().trim().min(1).max(500),
        originalPath: z.string().trim().max(500).optional(),
        analysisPath: z.string().trim().max(500).optional(),
        thumbnailPath: z.string().trim().max(500).optional(),
        contentHash: z.string().trim().length(64).optional(),
        mimeType: z.string().trim().max(100).optional(),
        byteSize: z.number().int().positive().optional(),
      })
    )
    .max(4)
    .refine(
      (images) =>
        new Set(images.map((image) => image.imageType)).size === images.length,
      "Jeder Bildtyp darf nur einmal verwendet werden."
    )
    .default([]),
});

export const onboardingPayloadSchema = z.object({
  identity: onboardingIdentityStepSchema,
  digitalIdentity: onboardingDigitalIdentityStepSchema,
  additionalData: onboardingAdditionalDataStepSchema,
  imageProfile: onboardingImageStepSchema,
});

export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;
