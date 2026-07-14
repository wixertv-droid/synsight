import { z } from "zod";

export const profileSchema = z.object({
  firstName: z.string().min(1, "Bitte geben Sie Ihren Vornamen ein."),
  lastName: z.string().min(1, "Bitte geben Sie Ihren Nachnamen ein."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  phone: z.string().optional(),
  company: z.string().optional(),
  region: z.string().min(1, "Bitte geben Sie Ihre Region ein."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
