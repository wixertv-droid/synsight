import { z } from "zod";
import { ANALYSIS_PRICES } from "@/lib/credits/pricing";

const analysisKeys = ANALYSIS_PRICES.map((entry) => entry.key) as [
  string,
  ...string[],
];

export const purchaseCreditsSchema = z.object({
  packageCode: z.string().min(3).max(64),
});

export const consumeCreditsSchema = z.object({
  analysisKey: z.enum(analysisKeys),
  requestId: z.string().max(64).optional(),
  confirm: z.literal(true),
});

export type PurchaseCreditsInput = z.infer<typeof purchaseCreditsSchema>;
export type ConsumeCreditsInput = z.infer<typeof consumeCreditsSchema>;
