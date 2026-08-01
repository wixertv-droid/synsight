import { z } from "zod";
import { ADMIN_API_PROVIDERS } from "@/lib/services/admin-platform-service";

const boolCoerce = z
  .union([z.boolean(), z.number(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1" || value === "true") return true;
    if (value === 0 || value === "0" || value === "false") return false;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Ungültiger Wahrheitswert.",
    });
    return z.NEVER;
  });

export const adminPlatformSettingsSchema = z.object({
  imageMaxUploadMb: z.coerce.number().int().min(1).max(256),
  imageCompressionQuality: z.coerce.number().int().min(1).max(100),
  imageWebpQuality: z.coerce.number().int().min(1).max(100),
  imageThumbnailQuality: z.coerce.number().int().min(1).max(100),
  imageMaxResolution: z.coerce.number().int().min(256).max(8192),
  encryptOriginals: boolCoerce,
  generateAnalysisImages: boolCoerce,
  digitalLeakDefaultRetentionDays: z.coerce
    .number()
    .int()
    .refine((value) => [-1, 0, 30, 90, 180, 365].includes(value), {
      message: "Ungültige Digital-Leak-Aufbewahrung.",
    })
    .optional(),
  supportHoursStart: z.string().trim().min(4).max(8).optional(),
  supportHoursEnd: z.string().trim().min(4).max(8).optional(),
  supportTimezone: z.string().trim().min(3).max(64).optional(),
  supportResponseText: z.string().trim().min(2).max(500).optional(),
});

const optionalApiUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .regex(/^https?:\/\//i, "API-URL muss mit http:// oder https:// beginnen.")
  .optional()
  .nullable();

export const adminApiCredentialSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upsert"),
    provider: z.enum(ADMIN_API_PROVIDERS),
    label: z.string().trim().min(2).max(150),
    secret: z.string().trim().min(8).max(4096).optional().nullable(),
    engineId: z
      .string()
      .trim()
      .min(6)
      .max(128)
      .regex(/^[a-zA-Z0-9:_-]+$/)
      .optional()
      .nullable(),
    accountEmail: z.string().trim().email().max(254).optional().nullable(),
    apiUrl: optionalApiUrl,
    isActive: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("toggle"),
    provider: z.enum(ADMIN_API_PROVIDERS),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("test"),
    provider: z.enum(ADMIN_API_PROVIDERS),
    secret: z.string().trim().min(8).max(4096).optional().nullable(),
    engineId: z
      .string()
      .trim()
      .min(6)
      .max(128)
      .regex(/^[a-zA-Z0-9:_-]+$/)
      .optional()
      .nullable(),
    accountEmail: z.string().trim().email().max(254).optional().nullable(),
    apiUrl: optionalApiUrl,
  }),
]);
