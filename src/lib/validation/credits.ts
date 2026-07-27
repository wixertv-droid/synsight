import { z } from "zod";

export const purchaseCreditsSchema = z.object({
  packageCode: z.string().min(3).max(64),
});

export const consumeCreditsSchema = z.object({
  analysisKey: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_]+$/, "Ungültiger Analyseschlüssel."),
  requestId: z
    .string()
    .trim()
    .min(8, "Anfragekennung fehlt oder ist ungültig.")
    .max(64),
  confirm: z.literal(true),
  /**
   * Optional multiplier — used for reverse_image_compare (1 SynCredit × Bild).
   * Defaults to 1. Max 200 to bound spend.
   */
  units: z.coerce.number().int().min(1).max(200).optional(),
});

export type PurchaseCreditsInput = z.infer<typeof purchaseCreditsSchema>;
export type ConsumeCreditsInput = z.infer<typeof consumeCreditsSchema>;
