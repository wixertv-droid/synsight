import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  getSearchProviderSettings,
  saveSearchProviderApiKey,
} from "@/lib/services/search-provider-service";
import { searchProviderSaveSchema } from "@/lib/validation/search-provider";
import { validateMutationOrigin } from "@/lib/security/request";
import { SEARCH_PROVIDER_OPTIONS } from "@/lib/search";

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

  const settings = await getSearchProviderSettings(access.user, "serpapi");
  return NextResponse.json(
    apiSuccess({
      settings,
      providers: SEARCH_PROVIDER_OPTIONS,
    })
  );
}

export async function PUT(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = searchProviderSaveSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Eingabe."
      ),
      { status: 400 }
    );
  }

  try {
    const settings = await saveSearchProviderApiKey(access.user, {
      provider: parsed.data.provider,
      apiKey: parsed.data.apiKey,
      enabled: parsed.data.enabled,
    });
    return NextResponse.json(apiSuccess({ settings }));
  } catch (error) {
    if (error instanceof Error && error.message === "PROVIDER_NOT_SUPPORTED") {
      return NextResponse.json(
        apiError(
          "PROVIDER_NOT_SUPPORTED",
          "Dieser Suchanbieter ist noch nicht freigeschaltet."
        ),
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "API_KEY_REQUIRED") {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "SerpAPI-Key ist erforderlich."),
        { status: 400 }
      );
    }
    throw error;
  }
}
