import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAccess } from "@/lib/admin/access";
import { apiError, apiSuccess } from "@/lib/api/response";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  generateSeoKeywordSuggestions,
  generateSeoOutlineSuggestions,
  generateSeoContentDraft,
} from "@/lib/seo/seo-gemini";

const baseSchema = z.object({
  title: z.string().trim().min(2).max(255),
  category: z.string().trim().min(1).max(64),
  targetModule: z.string().trim().min(1).max(64),
  searchIntent: z.enum([
    "informational",
    "commercial",
    "transactional",
    "navigational",
  ]),
  difficulty: z.enum(["einsteiger", "fortgeschritten", "experte"]),
  language: z.string().trim().min(2).max(8),
});

const keywordSchema = baseSchema.extend({
  action: z.literal("keywords"),
  existingKeywords: z
    .array(z.string().trim().min(1).max(200))
    .max(40)
    .default([]),
});

const outlineSchema = baseSchema.extend({
  action: z.literal("outline"),
  keywords: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
});

const contentSchema = baseSchema.extend({
  action: z.literal("content"),
  heroSubtitle: z.string().max(1000).default(""),
  keywords: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  sectionHeadings: z.array(z.string().trim().min(1).max(500)).min(1).max(20),
});

const requestSchema = z.discriminatedUnion("action", [
  keywordSchema,
  outlineSchema,
  contentSchema,
]);

function denied(status: 401 | 403) {
  return NextResponse.json(
    apiError(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Kein Zugriff"),
    { status }
  );
}

export async function POST(request: Request) {
  const access = await getAdminAccess();

  if (!access.granted) {
    return denied(access.status);
  }

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

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        "Die Angaben für den KI-Assistenten sind unvollständig."
      ),
      { status: 400 }
    );
  }

  try {
    const userId = Number(access.user.id) || null;

    if (parsed.data.action === "keywords") {
      return NextResponse.json(
        apiSuccess(
          await generateSeoKeywordSuggestions({
            ...parsed.data,
            userId,
          })
        )
      );
    }

    if (parsed.data.action === "outline") {
      return NextResponse.json(
        apiSuccess(
          await generateSeoOutlineSuggestions({
            ...parsed.data,
            userId,
          })
        )
      );
    }

    return NextResponse.json(
      apiSuccess(
        await generateSeoContentDraft({
          ...parsed.data,
          userId,
        })
      )
    );
  } catch (error) {
    console.error("[admin/seo/ai] generation failed", error);

    return NextResponse.json(
      apiError(
        "AI_ERROR",
        error instanceof Error
          ? error.message
          : "Gemini konnte den Inhalt nicht erstellen."
      ),
      { status: 502 }
    );
  }
}
