import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getAdminPlatformSettings,
  updateAdminPlatformSettings,
} from "@/lib/services/admin-platform-service";
import { supportHoursSchema } from "@/lib/validation/support";
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

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const settings = await getAdminPlatformSettings(access.user);
  return NextResponse.json(
    apiSuccess({
      settings: {
        supportHoursStart: settings.supportHoursStart,
        supportHoursEnd: settings.supportHoursEnd,
        supportTimezone: settings.supportTimezone,
        supportResponseText: settings.supportResponseText,
      },
    })
  );
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = supportHoursSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Support-Zeiten."
      ),
      { status: 400 }
    );
  }

  const settings = await updateAdminPlatformSettings(access.user, parsed.data);
  return NextResponse.json(
    apiSuccess({
      settings: {
        supportHoursStart: settings.supportHoursStart,
        supportHoursEnd: settings.supportHoursEnd,
        supportTimezone: settings.supportTimezone,
        supportResponseText: settings.supportResponseText,
      },
    })
  );
}
