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
  requestId: z.string().max(64).optional(),
  confirm: z.literal(true),
});

export type PurchaseCreditsInput = z.infer<typeof purchaseCreditsSchema>;
export type ConsumeCreditsInput = z.infer<typeof consumeCreditsSchema>;
