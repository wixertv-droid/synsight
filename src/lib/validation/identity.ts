import { z } from "zod";

export const socialPlatformSchema = z.enum([
  "Facebook",
  "Instagram",
  "TikTok",
  "X",
  "LinkedIn",
  "GitHub",
  "YouTube",
  "Reddit",
  "Pinterest",
  "Snapchat",
  "Discord",
  "Telegram",
  "Twitch",
  "Weitere",
]);

export const socialAccountStatusSchema = z.enum([
  "active",
  "former",
  "unknown",
]);

const optionalUrl = z
  .union([z.literal(""), z.string().trim().url().max(500)])
  .default("");

const flexibleUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .transform((value) =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`
  )
  .pipe(z.string().url().max(500));

export const identitySocialAccountSchema = z.object({
  platform: socialPlatformSchema,
  username: z
    .string()
    .trim()
    .min(1, "Bitte geben Sie einen Benutzernamen ein.")
    .max(150),
  profileUrl: optionalUrl,
  accountStatus: socialAccountStatusSchema.default("active"),
});

export const identityProfileSchema = z.object({
  personal: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    birthDate: z
      .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional()
      .default(""),
    gender: z
      .enum(["", "female", "male", "non_binary", "prefer_not_to_say", "other"])
      .optional()
      .default(""),
    phone: z.string().trim().max(32).optional().default(""),
    addressLine: z.string().trim().max(255).optional().default(""),
    location: z.string().trim().max(150).optional().default(""),
    previousLocations: z
      .array(z.string().trim().min(1).max(150))
      .max(30)
      .default([]),
    company: z.string().trim().max(150).optional().default(""),
  }),
  aliases: z
    .object({
      publicAlias: z.string().trim().max(100).optional().default(""),
      /** @deprecated merged into usernames — kept for API/backfill compatibility */
      nicknames: z.array(z.string().trim().min(1).max(150)).max(30).default([]),
      formerNames: z
        .array(z.string().trim().min(1).max(150))
        .max(30)
        .default([]),
      usernames: z.array(z.string().trim().min(1).max(150)).max(30).default([]),
      gamingNames: z
        .array(z.string().trim().min(1).max(150))
        .max(30)
        .default([]),
    })
    .transform((aliases) => {
      const seen = new Set<string>();
      const usernames: string[] = [];
      for (const value of [...aliases.usernames, ...aliases.nicknames]) {
        const cleaned = value.trim();
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        usernames.push(cleaned);
      }
      return {
        publicAlias: aliases.publicAlias,
        nicknames: [] as string[],
        formerNames: aliases.formerNames,
        usernames: usernames.slice(0, 30),
        gamingNames: aliases.gamingNames,
      };
    }),
  emails: z
    .array(z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse."))
    .max(20)
    .default([]),
  phoneNumbers: z.array(z.string().trim().min(5).max(32)).max(20).default([]),
  socialAccounts: z.array(identitySocialAccountSchema).max(40).default([]),
  websites: z.array(flexibleUrlSchema).max(20).default([]),
  domains: z.array(z.string().trim().min(3).max(255)).max(20).default([]),
  companies: z.array(z.string().trim().min(1).max(150)).max(20).default([]),
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

export type IdentityProfileInput = z.infer<typeof identityProfileSchema>;
export type SocialPlatform = z.infer<typeof socialPlatformSchema>;
