import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getApiUsageEventDetail,
  listApiCostSettings,
  listApiUsageEvents,
  upsertApiCostSetting,
} from "@/lib/services/finance-service";
import { validateMutationOrigin } from "@/lib/security/request";

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

const costSchema = z.object({
  providerCode: z.string().min(2).max(64),
  label: z.string().min(2).max(150),
  costPerRequestEur: z.number().min(0).max(1000),
  notes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const { searchParams } = new URL(request.url);
  const eventId = Number(searchParams.get("eventId") || "");
  if (Number.isFinite(eventId) && eventId > 0) {
    const event = await getApiUsageEventDetail(access.user, eventId);
    if (!event) {
      return NextResponse.json(
        apiError("NOT_FOUND", "API-Ausgabe nicht gefunden."),
        { status: 404 }
      );
    }
    return NextResponse.json(apiSuccess({ event }));
  }

  const providerCode = searchParams.get("provider") || undefined;
  const [settings, events] = await Promise.all([
    listApiCostSettings(access.user),
    listApiUsageEvents(access.user, { providerCode, limit: 80 }),
  ]);
  return NextResponse.json(apiSuccess({ settings, events }));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = costSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Kosteneingabe."
      ),
      { status: 400 }
    );
  }

  try {
    const setting = await upsertApiCostSetting(access.user, parsed.data);
    const settings = await listApiCostSettings(access.user);
    return NextResponse.json(apiSuccess({ setting, settings }));
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_REQUIRED") {
      return NextResponse.json(
        apiError("DATABASE_REQUIRED", "Datenbank ist erforderlich."),
        { status: 503 }
      );
    }
    throw error;
  }
}
