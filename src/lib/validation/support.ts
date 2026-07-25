import { z } from "zod";

export const supportHoursSchema = z.object({
  supportHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Bitte Startzeit als HH:MM angeben."),
  supportHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Bitte Endzeit als HH:MM angeben."),
  supportTimezone: z
    .string()
    .trim()
    .min(3, "Bitte eine Zeitzone angeben.")
    .max(64, "Die Zeitzone ist zu lang."),
  supportResponseText: z
    .string()
    .trim()
    .min(3, "Bitte einen Antworttext angeben.")
    .max(500, "Der Antworttext ist zu lang."),
});

export type SupportHoursInput = z.infer<typeof supportHoursSchema>;
