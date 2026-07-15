import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .max(255, "Die Eingabe ist zu lang.")
    .min(
      1,
      "Bitte geben Sie Ihren Benutzernamen oder Ihre E-Mail-Adresse ein."
    ),
  password: z
    .string()
    .max(256, "Die Eingabe ist zu lang.")
    .min(1, "Bitte geben Sie Ihr Passwort ein."),
});

export const passwordSchema = z
  .string()
  .min(12, "Das Passwort muss mindestens 12 Zeichen lang sein.")
  .max(128, "Das Passwort darf höchstens 128 Zeichen lang sein.")
  .regex(/[a-z]/, "Das Passwort benötigt einen Kleinbuchstaben.")
  .regex(/[A-Z]/, "Das Passwort benötigt einen Großbuchstaben.")
  .regex(/[0-9]/, "Das Passwort benötigt eine Zahl.")
  .regex(/[^A-Za-z0-9]/, "Das Passwort benötigt ein Sonderzeichen.");

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "Bitte geben Sie Ihren Vornamen ein.")
      .max(100, "Der Vorname ist zu lang."),
    lastName: z
      .string()
      .trim()
      .min(1, "Bitte geben Sie Ihren Nachnamen ein.")
      .max(100, "Der Nachname ist zu lang."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
      .max(255, "Die E-Mail-Adresse ist zu lang."),
    password: passwordSchema,
    passwordConfirm: z.string(),
    monitoringOptIn: z.boolean().optional().default(false),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export const verificationTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Der Bestätigungslink ist ungültig.")
    .max(256, "Der Bestätigungslink ist ungültig."),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
});

export const passwordResetRequestSchema = resendVerificationSchema;

export const passwordResetSchema = z
  .object({
    token: verificationTokenSchema.shape.token,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
