import { z } from "zod";

export const adminCreditAdjustmentSchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(3).max(500),
  confirm: z.literal(true),
});

export type AdminCreditAdjustmentInput = z.infer<
  typeof adminCreditAdjustmentSchema
>;
