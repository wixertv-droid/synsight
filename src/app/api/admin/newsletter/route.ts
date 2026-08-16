import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/response";

import { getAdminAccess } from "@/lib/admin/access";

import {
  addNewsletterSubscriber,
  cancelNewsletterSchedule,
  createNewsletterCampaign,
  createNewsletterTemplate,
  deleteNewsletterCampaign,
  getNewsletterOverview,
  getNewsletterSettings,
  listNewsletterCampaigns,
  listNewsletterSubscribers,
  listNewsletterTemplates,
  scheduleNewsletterCampaign,
  sendNewsletterNow,
  unsubscribeNewsletterSubscriber,
  updateNewsletterCampaign,
  updateNewsletterSettings,
} from "@/lib/services/newsletter-service";

import { validateMutationOrigin } from "@/lib/security/request";

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(
      status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      status === 401
        ? "Sie müssen angemeldet sein."
        : "Administratorrechte erforderlich."
    ),
    {
      status,
    }
  );
}

function errorResponse(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : "Newsletter-Aktion fehlgeschlagen.";

  const messages: Record<string, string> = {
    NEWSLETTER_NOT_FOUND: "Newsletter wurde nicht gefunden.",

    NEWSLETTER_LOCKED:
      "Diese Kampagne kann während oder nach dem Versand nicht mehr verändert werden.",

    NEWSLETTER_NO_ACTIVE_SUBSCRIBERS:
      "Es gibt noch keine aktiven Newsletter-Empfänger mit dokumentierter Einwilligung.",

    NEWSLETTER_DELETE_NOT_ALLOWED:
      "Nur Entwürfe oder abgebrochene Kampagnen können gelöscht werden.",

    NEWSLETTER_CONSENT_REQUIRED:
      "Für diesen Empfänger muss eine Newsletter-Einwilligung bestätigt werden.",

    NEWSLETTER_DISABLED: "Das Newsletter-System ist derzeit deaktiviert.",

    NEWSLETTER_SMTP_NOT_READY:
      "Das Newsletter-SMTP-Konto ist noch nicht aktiviert oder vollständig eingerichtet.",

    NEWSLETTER_INVALID_SCHEDULE:
      "Das gewählte Versanddatum oder die Uhrzeit ist ungültig.",
  };

  return NextResponse.json(apiError(raw, messages[raw] ?? raw), {
    status: raw === "NEWSLETTER_NOT_FOUND" ? 404 : 400,
  });
}

export async function GET(request: Request) {
  const access = await getAdminAccess();

  if (!access.granted) {
    return denied(access.status);
  }

  const url = new URL(request.url);

  const resource = url.searchParams.get("resource") ?? "overview";

  try {
    if (resource === "overview") {
      return NextResponse.json(
        apiSuccess(await getNewsletterOverview(access.user))
      );
    }

    if (resource === "campaigns") {
      return NextResponse.json(
        apiSuccess(await listNewsletterCampaigns(access.user))
      );
    }

    if (resource === "templates") {
      return NextResponse.json(
        apiSuccess(await listNewsletterTemplates(access.user))
      );
    }

    if (resource === "subscribers") {
      return NextResponse.json(
        apiSuccess(await listNewsletterSubscribers(access.user))
      );
    }

    if (resource === "settings") {
      return NextResponse.json(
        apiSuccess(await getNewsletterSettings(access.user))
      );
    }

    return NextResponse.json(
      apiError("INVALID_RESOURCE", "Unbekannter Newsletter-Bereich."),
      {
        status: 400,
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

const campaignSchema = z.object({
  action: z.literal("create_campaign"),

  internalName: z.string().trim().min(1).max(180),

  subject: z.string().trim().min(1).max(255),

  preheader: z.string().trim().max(255).nullable().optional(),

  templateId: z.number().int().positive().nullable().optional(),

  contentJson: z.unknown(),

  renderedHtml: z.string().min(1),

  senderName: z.string().trim().max(150).nullable().optional(),

  replyTo: z.string().trim().email().nullable().optional(),
});

const templateSchema = z.object({
  action: z.literal("create_template"),

  name: z.string().trim().min(1).max(180),

  description: z.string().trim().max(500).nullable().optional(),

  category: z.string().trim().max(64).optional(),

  contentJson: z.unknown(),

  renderedHtml: z.string().min(1),
});

const subscriberSchema = z.object({
  action: z.literal("add_subscriber"),

  email: z.string().trim().email(),

  name: z.string().trim().max(180).nullable().optional(),

  consentConfirmed: z.literal(true),
});

const createSchema = z.discriminatedUnion("action", [
  campaignSchema,
  templateSchema,
  subscriberSchema,
]);

export async function POST(request: Request) {
  const access = await getAdminAccess();

  if (!access.granted) {
    return denied(access.status);
  }

  const originError = validateMutationOrigin(request);

  if (originError) {
    return originError;
  }

  const json = await request.json().catch(() => null);

  const parsed = createSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen."
      ),
      {
        status: 400,
      }
    );
  }

  try {
    if (parsed.data.action === "create_campaign") {
      return NextResponse.json(
        apiSuccess(await createNewsletterCampaign(access.user, parsed.data))
      );
    }

    if (parsed.data.action === "create_template") {
      return NextResponse.json(
        apiSuccess(await createNewsletterTemplate(access.user, parsed.data))
      );
    }

    return NextResponse.json(
      apiSuccess(await addNewsletterSubscriber(access.user, parsed.data))
    );
  } catch (error) {
    return errorResponse(error);
  }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_campaign"),

    id: z.number().int().positive(),

    internalName: z.string().trim().max(180).optional(),

    subject: z.string().trim().max(255).optional(),

    preheader: z.string().trim().max(255).nullable().optional(),

    templateId: z.number().int().positive().nullable().optional(),

    contentJson: z.unknown().optional(),

    renderedHtml: z.string().optional(),

    senderName: z.string().trim().max(150).nullable().optional(),

    replyTo: z.string().trim().email().nullable().optional(),

    audienceType: z.string().trim().max(64).optional(),

    audienceJson: z.unknown().optional(),
  }),

  z.object({
    action: z.literal("schedule"),

    id: z.number().int().positive(),

    scheduledAt: z.string().trim().min(1),

    timezone: z.string().trim().min(1).max(64),
  }),

  z.object({
    action: z.literal("send_now"),

    id: z.number().int().positive(),
  }),

  z.object({
    action: z.literal("cancel_schedule"),

    id: z.number().int().positive(),
  }),

  z.object({
    action: z.literal("unsubscribe"),

    id: z.number().int().positive(),
  }),

  z.object({
    action: z.literal("settings"),

    enabled: z.boolean(),

    defaultSenderName: z.string().trim().min(1).max(150),

    defaultReplyTo: z.string().trim().email().nullable().optional(),

    defaultTimezone: z.string().trim().min(1).max(64),

    batchSize: z.number().int().min(1).max(250),

    workerIntervalSeconds: z.number().int().min(10).max(3600),

    unsubscribeFooterText: z.string().max(5000).nullable().optional(),

    companyAddress: z.string().max(500).nullable().optional(),
  }),
]);

export async function PATCH(request: Request) {
  const access = await getAdminAccess();

  if (!access.granted) {
    return denied(access.status);
  }

  const originError = validateMutationOrigin(request);

  if (originError) {
    return originError;
  }

  const json = await request.json().catch(() => null);

  const parsed = patchSchema.safeParse(json);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];

    const field = issue?.path?.length ? issue.path.join(".") : "Eingabe";

    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        `${field}: ${issue?.message ?? "Bitte Eingaben prüfen."}`
      ),
      {
        status: 400,
      }
    );
  }

  try {
    switch (parsed.data.action) {
      case "update_campaign":
        return NextResponse.json(
          apiSuccess(
            await updateNewsletterCampaign(
              access.user,
              parsed.data.id,
              parsed.data
            )
          )
        );

      case "schedule":
        return NextResponse.json(
          apiSuccess(
            await scheduleNewsletterCampaign(
              access.user,
              parsed.data.id,
              parsed.data.scheduledAt,
              parsed.data.timezone
            )
          )
        );

      case "send_now":
        return NextResponse.json(
          apiSuccess(await sendNewsletterNow(access.user, parsed.data.id))
        );

      case "cancel_schedule":
        return NextResponse.json(
          apiSuccess(
            await cancelNewsletterSchedule(access.user, parsed.data.id)
          )
        );

      case "unsubscribe":
        return NextResponse.json(
          apiSuccess(
            await unsubscribeNewsletterSubscriber(access.user, parsed.data.id)
          )
        );

      case "settings":
        return NextResponse.json(
          apiSuccess(await updateNewsletterSettings(access.user, parsed.data))
        );
    }
  } catch (error) {
    return errorResponse(error);
  }
}

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

export async function DELETE(request: Request) {
  const access = await getAdminAccess();

  if (!access.granted) {
    return denied(access.status);
  }

  const originError = validateMutationOrigin(request);

  if (originError) {
    return originError;
  }

  const json = await request.json().catch(() => null);

  const parsed = deleteSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Ungültige Kampagne."),
      {
        status: 400,
      }
    );
  }

  try {
    return NextResponse.json(
      apiSuccess(await deleteNewsletterCampaign(access.user, parsed.data.id))
    );
  } catch (error) {
    return errorResponse(error);
  }
}
