import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { testSearchProviderConnection } from "@/lib/services/search-provider-service";
import { searchProviderTestSchema } from "@/lib/validation/search-provider";
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

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const parsed = searchProviderTestSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Testanfrage."
      ),
      { status: 400 }
    );
  }

  const result = await testSearchProviderConnection(access.user, {
    provider: parsed.data.provider,
    apiKey: parsed.data.apiKey,
  });

  return NextResponse.json(apiSuccess({ result }));
}
