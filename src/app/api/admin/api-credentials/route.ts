import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  listApiCredentials,
  upsertApiCredential,
} from "@/lib/services/api-credentials-service";
import { upsertApiCredentialSchema } from "@/lib/validation/api-credentials";
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
  const credentials = await listApiCredentials(access.user);
  return NextResponse.json(apiSuccess({ credentials }));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = upsertApiCredentialSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige API-Konfiguration."
      ),
      { status: 400 }
    );
  }

  if (
    parsed.data.provider === "google_custom_search" &&
    parsed.data.secret &&
    !parsed.data.engineId
  ) {
    // Allow update of secret without engineId if engine already stored —
    // service keeps existing engineId when undefined. Require engineId only
    // when creating fresh; validated in service via existing row.
  }

  try {
    const credential = await upsertApiCredential(access.user, parsed.data);
    if (
      parsed.data.provider === "google_custom_search" &&
      !credential.engineId
    ) {
      return NextResponse.json(
        apiError(
          "VALIDATION_ERROR",
          "Bitte die Search-Engine-ID (cx) eintragen — z. B. 0728bba0e53574410."
        ),
        { status: 400 }
      );
    }
    return NextResponse.json(apiSuccess({ credential }));
  } catch (error) {
    if (error instanceof Error && error.message === "SECRET_REQUIRED") {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "API-Schlüssel ist erforderlich."),
        { status: 400 }
      );
    }
    throw error;
  }
}
