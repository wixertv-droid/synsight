import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  listAdminApiCredentials,
  setAdminApiCredentialActive,
  upsertAdminApiCredential,
} from "@/lib/services/admin-platform-service";
import { adminApiCredentialSchema } from "@/lib/validation/admin-platform";
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
  const credentials = await listAdminApiCredentials(access.user);
  return NextResponse.json(apiSuccess({ credentials }));
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = adminApiCredentialSchema.safeParse(
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

  if (parsed.data.action === "toggle") {
    const credential = await setAdminApiCredentialActive(
      access.user,
      parsed.data.provider,
      parsed.data.isActive
    );
    if (!credential) {
      return NextResponse.json(
        apiError("NOT_FOUND", "API-Anbieter ist noch nicht konfiguriert."),
        { status: 404 }
      );
    }
    return NextResponse.json(apiSuccess({ credential }));
  }

  if (parsed.data.action === "test") {
    const { testApiCredentialConnection } =
      await import("@/lib/services/api-credentials-service");
    const result = await testApiCredentialConnection({
      provider: parsed.data.provider,
      secret: parsed.data.secret,
      engineId: parsed.data.engineId,
    });
    const credentials = await listAdminApiCredentials(access.user);
    return NextResponse.json(apiSuccess({ result, credentials }));
  }

  try {
    const credential = await upsertAdminApiCredential(access.user, {
      provider: parsed.data.provider,
      label: parsed.data.label,
      secret: parsed.data.secret,
      engineId: parsed.data.engineId,
      isActive: parsed.data.isActive,
    });

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
