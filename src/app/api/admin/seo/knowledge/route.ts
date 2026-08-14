import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import {
  AdminForbiddenError,
  createSeoKnowledgePage,
  listSeoKnowledgePages,
  SeoPageConflictError,
} from "@/lib/services/seo-knowledge-service";
import {
  seoKnowledgeListQuerySchema,
  seoKnowledgeUpsertSchema,
} from "@/lib/validation/admin-seo-knowledge";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Kein Zugriff"),
    { status }
  );
}

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const url = new URL(request.url);
  const parsed = seoKnowledgeListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "Ungültige Filter"), {
      status: 400,
    });
  }

  const q = parsed.data;
  try {
    const result = await listSeoKnowledgePages(access.user, {
      q: q.q,
      category: q.category,
      status: q.status,
      targetModule: q.targetModule,
      priority: q.priority,
      language: q.language,
      trash: q.trash === "1" || q.trash === "true",
      sortBy: q.sortBy,
      sortDir: q.sortDir,
      limit: q.limit,
      offset: q.offset,
    });
    return NextResponse.json(apiSuccess(result));
  } catch (error) {
    if (error instanceof AdminForbiddenError) return denied(403);
    console.error("[admin/seo/knowledge] list failed:", error);
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Seiten konnten nicht geladen werden"),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);
  const originError = validateMutationOrigin(request);
  if (originError) {
    return originError;
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
    const page = await createSeoKnowledgePage(access.user, parsed.data);
    void getClientIp(request);
    return NextResponse.json(apiSuccess(page), { status: 201 });
  } catch (error) {
    if (error instanceof AdminForbiddenError) return denied(403);
    if (error instanceof SeoPageConflictError) {
      return NextResponse.json(apiError("CONFLICT", error.message), {
        status: 409,
      });
    }
    console.error("[admin/seo/knowledge] create failed:", error);
    return NextResponse.json(
      apiError("INTERNAL_ERROR", "Seite konnte nicht erstellt werden"),
      { status: 500 }
    );
  }
}
