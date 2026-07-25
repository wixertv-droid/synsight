import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { computeUsernameFinance } from "@/lib/analysis/username/finance";
import {
  getUsernameModuleSettings,
  updateUsernameModuleSettings,
} from "@/lib/analysis/username/settings";
import type { UsernameModuleSettings } from "@/lib/analysis/username/types";
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
    const settings = await getUsernameModuleSettings();
    return NextResponse.json(
      apiSuccess({ settings, finance: computeUsernameFinance(settings) })
    );
  } catch (error) {
    console.error("[admin/username-module] GET failed", error);
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
    const body = (await request.json()) as Partial<UsernameModuleSettings>;
    const adminId = Number.parseInt(access.user.id, 10);
    const settings = await updateUsernameModuleSettings(
      body,
      Number.isFinite(adminId) ? adminId : null
    );
    return NextResponse.json(
      apiSuccess({ settings, finance: computeUsernameFinance(settings) })
    );
  } catch (error) {
    console.error("[admin/username-module] PUT failed", error);
    return NextResponse.json(
      apiError(
        "SAVE_FAILED",
        "Einstellungen konnten nicht gespeichert werden."
      ),
      { status: 500 }
    );
  }
}
