import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  AdminForbiddenError,
  getSeoKnowledgePageAdmin,
  hardDeleteSeoKnowledgePage,
  restoreSeoKnowledgePage,
  SeoPageConflictError,
  SeoPageNotFoundError,
  softDeleteSeoKnowledgePage,
  updateSeoKnowledgePage,
} from "@/lib/services/seo-knowledge-service";
import { seoKnowledgeUpsertSchema } from "@/lib/validation/admin-seo-knowledge";
import { validateMutationOrigin } from "@/lib/security/request";

type Ctx = { params: Promise<{ id: string }> };

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Kein Zugriff"),
    { status }
  );
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, ctx: Ctx) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const id = parseId((await ctx.params).id);
  if (!id) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Ungültige ID"), {
      status: 400,
    });
  }
  try {
    const page = await getSeoKnowledgePageAdmin(access.user, id, true);
    return NextResponse.json(apiSuccess(page));
  } catch (error) {
    if (error instanceof SeoPageNotFoundError) {
      return NextResponse.json(apiError("NOT_FOUND", "Seite nicht gefunden"), {
        status: 404,
      });
    }
    if (error instanceof AdminForbiddenError) return denied(403);
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Seite konnte nicht geladen werden"),
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const originError = validateMutationOrigin(request);
  if (originError) {
    return originError;
  }
  const id = parseId((await ctx.params).id);
  if (!id) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Ungültige ID"), {
      status: 400,
    });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "restore") {
    try {
      return NextResponse.json(
        apiSuccess(await restoreSeoKnowledgePage(access.user, id))
      );
    } catch (error) {
      if (error instanceof SeoPageNotFoundError) {
        return NextResponse.json(
          apiError("NOT_FOUND", "Seite nicht gefunden"),
          {
            status: 404,
          }
        );
      }
      return denied(403);
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Ungültiges JSON"), {
      status: 400,
    });
  }
  const parsed = seoKnowledgeUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Validierung fehlgeschlagen"),
      { status: 400 }
    );
  }

  try {
    const page = await updateSeoKnowledgePage(access.user, id, parsed.data);
    return NextResponse.json(apiSuccess(page));
  } catch (error) {
    if (error instanceof SeoPageNotFoundError) {
      return NextResponse.json(apiError("NOT_FOUND", "Seite nicht gefunden"), {
        status: 404,
      });
    }
    if (error instanceof SeoPageConflictError) {
      return NextResponse.json(apiError("CONFLICT", error.message), {
        status: 409,
      });
    }
    if (error instanceof AdminForbiddenError) return denied(403);
    console.error("[admin/seo/knowledge/:id] update failed:", error);
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Seite konnte nicht gespeichert werden"),
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const originError = validateMutationOrigin(request);
  if (originError) {
    return originError;
  }
  const id = parseId((await ctx.params).id);
  if (!id) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Ungültige ID"), {
      status: 400,
    });
  }

  const hard = new URL(request.url).searchParams.get("hard") === "1";
  try {
    const result = hard
      ? await hardDeleteSeoKnowledgePage(access.user, id)
      : await softDeleteSeoKnowledgePage(access.user, id);
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    if (error instanceof SeoPageNotFoundError) {
      return NextResponse.json(apiError("NOT_FOUND", "Seite nicht gefunden"), {
        status: 404,
      });
    }
    if (error instanceof AdminForbiddenError) return denied(403);
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Seite konnte nicht gelöscht werden"),
      { status: 500 }
    );
  }
}
