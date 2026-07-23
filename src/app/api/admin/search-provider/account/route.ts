import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { getSerpApiAccountSnapshot } from "@/lib/services/search-provider-service";

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

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";
  const account = await getSerpApiAccountSnapshot(access.user, {
    forceRefresh,
  });

  if (!account) {
    return NextResponse.json(
      apiError(
        "NOT_CONFIGURED",
        "SerpAPI-Key fehlt oder Account-API nicht erreichbar."
      ),
      { status: 404 }
    );
  }

  return NextResponse.json(apiSuccess({ account }));
}
