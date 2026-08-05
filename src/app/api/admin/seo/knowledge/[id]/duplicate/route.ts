import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  AdminForbiddenError,
  duplicateSeoKnowledgePage,
  SeoPageNotFoundError,
} from "@/lib/services/seo-knowledge-service";
import { validateMutationOrigin } from "@/lib/security/request";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const access = await getAdminAccess();
  if (!access.granted) {
    return NextResponse.json(
      apiError(
        access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        "Kein Zugriff"
      ),
      { status: access.status }
    );
  }
  if (!validateMutationOrigin(request)) {
    return NextResponse.json(
      apiError("FORBIDDEN", "Ungültiger Request-Origin"),
      { status: 403 }
    );
  }

  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Ungültige ID"), {
      status: 400,
    });
  }

  try {
    const page = await duplicateSeoKnowledgePage(access.user, id);
    return NextResponse.json(apiSuccess(page), { status: 201 });
  } catch (error) {
    if (error instanceof SeoPageNotFoundError) {
      return NextResponse.json(apiError("NOT_FOUND", "Seite nicht gefunden"), {
        status: 404,
      });
    }
    if (error instanceof AdminForbiddenError) {
      return NextResponse.json(apiError("FORBIDDEN", "Kein Zugriff"), {
        status: 403,
      });
    }
    console.error("[admin/seo/knowledge/duplicate] failed:", error);
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Duplizieren fehlgeschlagen"),
      { status: 500 }
    );
  }
}
