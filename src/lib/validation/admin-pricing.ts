import { z } from "zod";

const keySchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9_]+$/);

export const adminAnalysisPricingSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("upsert"),
    analysisKey: keySchema,
    label: z.string().trim().min(2).max(150),
    description: z.string().trim().max(500).nullable().default(null),
    credits: z.number().int().min(1).max(100_000),
    sortOrder: z.number().int().min(0).max(100_000),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("reset"),
    scope: z.enum(["analyses", "all"]).default("analyses"),
    confirm: z.literal(true),
  }),
]);

export const adminPackagePricingSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    code: keySchema,
    name: z.string().trim().min(2).max(150),
    credits: z.number().int().min(1).max(10_000_000),
    bonusCredits: z.number().int().min(0).max(10_000_000),
    priceCents: z.number().int().min(1).max(100_000_000),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase()),
    badge: z.string().trim().max(64).nullable().default(null),
    sortOrder: z.number().int().min(0).max(100_000),
    isActive: z.boolean(),
    isPopular: z.boolean(),
  }),
  z.object({
    action: z.literal("reset"),
    scope: z.enum(["packages", "all"]).default("packages"),
    confirm: z.literal(true),
  }),
]);
