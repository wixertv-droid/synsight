import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getMailSettings,
  MAIL_ACCOUNT_KEYS,
  saveMailSettings,
  sendMailAccountTest,
  testMailAccount,
} from "@/lib/services/mail-settings-service";
import { validateMutationOrigin } from "@/lib/security/request";

const keySchema = z.enum(MAIL_ACCOUNT_KEYS);

const accountSchema = z.object({
  enabled: z.boolean(),
  username: z.string().trim().max(255),
  password: z.string().max(1000).optional(),
  fromName: z.string().trim().max(150),
  fromEmail: z.union([
    z.string().trim().email("Ungültige Absender-E-Mail."),
    z.literal(""),
  ]),
});

const settingsSchema = z.object({
  server: z.object({
    host: z.string().trim().min(1, "SMTP-Host fehlt.").max(255),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
  }),
  accounts: z.object({
    contact: accountSchema,
    support: accountSchema,
    press: accountSchema,
    partner: accountSchema,
    privacy: accountSchema,
    newsletter: accountSchema,
    system: accountSchema,
  }),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify"),
    account: keySchema,
  }),
  z.object({
    action: z.literal("send_test"),
    account: keySchema,
    to: z.string().trim().email("Ungültige Testadresse."),
  }),
]);

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(
      status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      status === 401
        ? "Sie müssen angemeldet sein."
        : "Administratorrechte erforderlich."
    ),
    { status }
  );
}

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  return NextResponse.json(apiSuccess(await getMailSettings(access.user)));
}

export async function PUT(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const originError = validateMutationOrigin(request);
  if (originError) return originError;

  const json = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte SMTP-Einstellungen prüfen."
      ),
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      apiSuccess(await saveMailSettings(access.user, parsed.data))
    );
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Speichern fehlgeschlagen.";

    const match = raw.match(/^SMTP_PASSWORD_REQUIRED:(.+)$/);

    return NextResponse.json(
      apiError(
        "SMTP_SAVE_FAILED",
        match
          ? `Für das aktivierte Konto „${match[1]}“ fehlt das SMTP-Passwort.`
          : raw
      ),
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const originError = validateMutationOrigin(request);
  if (originError) return originError;

  const json = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültiger SMTP-Test."
      ),
      { status: 400 }
    );
  }

  if (parsed.data.action === "verify") {
    return NextResponse.json(
      apiSuccess(await testMailAccount(access.user, parsed.data.account))
    );
  }

  return NextResponse.json(
    apiSuccess(
      await sendMailAccountTest(
        access.user,
        parsed.data.account,
        parsed.data.to
      )
    )
  );
}
