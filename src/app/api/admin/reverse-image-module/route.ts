import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getReverseImageModuleSettings,
  updateReverseImageModuleSettings,
} from "@/lib/analysis/reverse-image/settings";
import type { ReverseImageModuleSettings } from "@/lib/analysis/reverse-image/settings-types";
import { NextResponse } from "next/server";
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

  try {
    const settings = await getReverseImageModuleSettings();
    return NextResponse.json(apiSuccess({ settings }));
  } catch (error) {
    console.error("[admin/reverse-image-module] GET failed", error);
    return NextResponse.json(
      apiError("LOAD_FAILED", "Einstellungen nicht ladbar."),
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  try {
    const body = (await request.json()) as Partial<ReverseImageModuleSettings>;
    const adminId = Number.parseInt(access.user.id, 10);
    const settings = await updateReverseImageModuleSettings(
      body,
      Number.isFinite(adminId) ? adminId : null
    );
    return NextResponse.json(apiSuccess({ settings }));
  } catch (error) {
    console.error("[admin/reverse-image-module] PUT failed", error);
    return NextResponse.json(
      apiError(
        "SAVE_FAILED",
        "Einstellungen konnten nicht gespeichert werden."
      ),
      { status: 500 }
    );
  }
}
