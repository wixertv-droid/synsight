import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Bitte geben Sie Ihren Benutzernamen oder Ihre E-Mail-Adresse ein."),
  password: z.string().min(1, "Bitte geben Sie Ihr Passwort ein."),
});

export const registerSchema = z.object({
  firstName: z.string().min(1, "Bitte geben Sie Ihren Vornamen ein."),
  lastName: z.string().min(1, "Bitte geben Sie Ihren Nachnamen ein."),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  password: z
    .string()
    .min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
  monitoringOptIn: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
