import { z } from "zod";

const optionalTrimmed = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

/** Honeypot — must stay empty. Bots that fill hidden fields are rejected. */
const honeypotSchema = z
  .string()
  .max(0, "Anfrage abgelehnt.")
  .optional()
  .default("");

export const requestStatusSchema = z.enum([
  "new",
  "processing",
  "answered",
  "archived",
]);

export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const contactRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Bitte geben Sie Ihren Namen ein.")
    .max(150, "Der Name ist zu lang."),
  company: optionalTrimmed(200, "Der Firmenname ist zu lang."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
    .max(255, "Die E-Mail-Adresse ist zu lang."),
  phone: optionalTrimmed(64, "Die Telefonnummer ist zu lang."),
  subject: z
    .string()
    .trim()
    .min(3, "Bitte geben Sie einen Betreff ein.")
    .max(200, "Der Betreff ist zu lang."),
  message: z
    .string()
    .trim()
    .min(10, "Bitte schreiben Sie eine etwas ausführlichere Nachricht.")
    .max(5000, "Die Nachricht ist zu lang."),
  website: honeypotSchema,
});

export const partnerRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Bitte geben Sie Ihren Namen ein.")
    .max(150, "Der Name ist zu lang."),
  company: z
    .string()
    .trim()
    .min(2, "Bitte geben Sie Ihr Unternehmen an.")
    .max(200, "Der Unternehmensname ist zu lang."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
    .max(255, "Die E-Mail-Adresse ist zu lang."),
  partnershipType: z
    .string()
    .trim()
    .min(2, "Bitte wählen oder beschreiben Sie die Art der Partnerschaft.")
    .max(120, "Die Angabe ist zu lang."),
  message: z
    .string()
    .trim()
    .min(10, "Bitte beschreiben Sie Ihr Anliegen etwas ausführlicher.")
    .max(5000, "Die Nachricht ist zu lang."),
  website: honeypotSchema,
});

export const pressRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Bitte geben Sie Ihren Namen ein.")
    .max(150, "Der Name ist zu lang."),
  medium: z
    .string()
    .trim()
    .min(2, "Bitte geben Sie Ihr Medium an.")
    .max(200, "Der Medienname ist zu lang."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Bitte geben Sie eine gültige E-Mail-Adresse ein.")
    .max(255, "Die E-Mail-Adresse ist zu lang."),
  phone: optionalTrimmed(64, "Die Telefonnummer ist zu lang."),
  topic: z
    .string()
    .trim()
    .min(3, "Bitte geben Sie ein Thema an.")
    .max(200, "Das Thema ist zu lang."),
  message: z
    .string()
    .trim()
    .min(10, "Bitte beschreiben Sie Ihre Anfrage etwas ausführlicher.")
    .max(5000, "Die Nachricht ist zu lang."),
  website: honeypotSchema,
});

export const communicationSettingsSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ungültige Kontakt-E-Mail.")
    .max(255),
  pressEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ungültige Presse-E-Mail.")
    .max(255),
  partnersEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ungültige Partnerschafts-E-Mail.")
    .max(255),
});

export const adminRequestStatusUpdateSchema = z.object({
  channel: z.enum(["contact", "partner", "press"]),
  id: z.number().int().positive(),
  status: requestStatusSchema,
  adminNotes: z
    .string()
    .trim()
    .max(2000, "Die Notiz ist zu lang.")
    .optional()
    .nullable(),
});

/** Forward always goes to the mailbox of the request's own channel/tab. */
export const adminRequestForwardSchema = z.object({
  channel: z.enum(["contact", "partner", "press"]),
  id: z.number().int().positive(),
});

export const adminRequestDeleteSchema = z.object({
  channel: z.enum(["contact", "partner", "press"]),
  id: z.number().int().positive(),
});

export type ContactRequestInput = z.input<typeof contactRequestSchema>;
export type PartnerRequestInput = z.input<typeof partnerRequestSchema>;
export type PressRequestInput = z.input<typeof pressRequestSchema>;
export type CommunicationSettingsInput = z.infer<
  typeof communicationSettingsSchema
>;
