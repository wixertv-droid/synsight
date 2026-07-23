import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getAdminPlatformSettings,
  updateAdminPlatformSettings,
} from "@/lib/services/admin-platform-service";
import { adminPlatformSettingsSchema } from "@/lib/validation/admin-platform";
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
  return NextResponse.json(apiSuccess({ settings }));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = adminPlatformSettingsSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Plattform-Einstellungen."
      ),
      { status: 400 }
    );
  }

  const settings = await updateAdminPlatformSettings(access.user, parsed.data);
  return NextResponse.json(apiSuccess({ settings }));
}
