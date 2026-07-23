import { z } from "zod";
import { API_PROVIDERS } from "@/lib/services/api-credentials-service";

export const upsertApiCredentialSchema = z.object({
  provider: z.enum(API_PROVIDERS),
  secret: z.string().trim().min(8).max(4096).optional().nullable(),
  engineId: z
    .string()
    .trim()
    .min(6)
    .max(128)
    .regex(/^[a-zA-Z0-9:_-]+$/)
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
  label: z.string().trim().min(2).max(150).optional(),
});
