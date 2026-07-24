import { z } from "zod";
import { ADMIN_API_PROVIDERS } from "@/lib/services/admin-platform-service";

export const adminPlatformSettingsSchema = z.object({
  imageMaxUploadMb: z.number().int().min(1).max(256),
  imageCompressionQuality: z.number().int().min(1).max(100),
  imageWebpQuality: z.number().int().min(1).max(100),
  imageThumbnailQuality: z.number().int().min(1).max(100),
  imageMaxResolution: z.number().int().min(256).max(8192),
  encryptOriginals: z.boolean(),
  generateAnalysisImages: z.boolean(),
});

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
  }),
]);
