import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT erforderlich.")
  .nullable()
  .optional();

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Uhrzeit im Format HH:MM erforderlich.")
  .nullable()
  .optional();

const promotionFieldsSchema = {
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().default(false),
  startsAt: dateSchema,
  endsAt: dateSchema,
  timeFrom: timeSchema,
  timeTo: timeSchema,
  timezone: z.string().trim().min(2).max(64).default("Europe/Berlin"),
  bonusCredits: z.number().int().min(1).max(1_000_000),
  promoCodeRequired: z.boolean().default(false),
  promoCode: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9_-]*$/, "Nur Buchstaben, Zahlen, _ und - erlaubt.")
    .nullable()
    .optional(),
  newUsersOnly: z.boolean().default(false),
  existingUsersOnly: z.boolean().default(false),
  singleUsePerUser: z.boolean().default(true),
  maxParticipants: z.number().int().min(1).nullable().optional(),
  minBalance: z.number().int().min(0).nullable().optional(),
  budgetCredits: z.number().int().min(1).nullable().optional(),
};

export const adminPromotionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    ...promotionFieldsSchema,
  }),
  z.object({
    action: z.literal("update"),
    id: z.number().int().positive(),
    ...promotionFieldsSchema,
  }),
  z.object({
    action: z.literal("set_active"),
    id: z.number().int().positive(),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("delete"),
    id: z.number().int().positive(),
    confirm: z.literal(true),
  }),
]);

export const promotionNotificationSchema = z.object({
  rewardId: z.number().int().positive(),
});
