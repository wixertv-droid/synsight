import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  clearHitAction,
  createSynSightOrder,
  listHitActions,
  upsertHitAction,
  type AnalysisSourceModule,
} from "@/lib/services/hit-actions-service";

const moduleSchema = z.enum([
  "google_search",
  "username_intelligence",
  "digital_leak_exposure",
  "reverse_image_search",
]);

const actionSchema = z.object({
  kind: z.enum(["ignored", "self", "ordered", "resolved", "clear"]),
  sourceModule: moduleSchema,
  platform: z.string().trim().min(1).max(120),
  profileUrl: z.string().trim().url().nullable().optional(),
  title: z.string().trim().max(255).optional(),
  analysisId: z.number().int().positive().optional().nullable(),
  orderType: z
    .enum([
      "profile_delete",
      "google_removal",
      "forum_contact",
      "gdpr",
      "cache_removal",
      "privacy_request",
    ])
    .optional()
    .nullable(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }
  const url = new URL(request.url);
  const moduleParam = url.searchParams.get("module");
  const parsedModule = moduleSchema.safeParse(moduleParam);
  const sourceModule = parsedModule.success
    ? (parsedModule.data as AnalysisSourceModule)
    : undefined;
  const actions = await listHitActions(Number(user.id), sourceModule);
  return NextResponse.json(
    apiSuccess({
      actions,
      ignoredFingerprints: actions
        .filter((row) => row.action === "ignored")
        .map((row) => row.hitFingerprint),
      excludedFingerprints: actions
        .filter((row) => row.action === "ignored" || row.action === "resolved")
        .map((row) => row.hitFingerprint),
    })
  );
}

export async function POST(request: Request) {
  const csrfError = validateMutationOrigin(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Ungültige Aktion."
      ),
      { status: 400 }
    );
  }

  const userId = Number(user.id);
  const data = parsed.data;

  if (data.kind === "clear") {
    await clearHitAction({
      userId,
      sourceModule: data.sourceModule,
      platform: data.platform,
      profileUrl: data.profileUrl ?? null,
      title: data.title,
    });
    return NextResponse.json(apiSuccess({ cleared: true }));
  }

  if (data.kind === "ordered") {
    if (!data.orderType) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "orderType fehlt für SynSight-Auftrag."),
        { status: 400 }
      );
    }
    const order = await createSynSightOrder({
      userId,
      sourceModule: data.sourceModule,
      platform: data.platform,
      profileUrl: data.profileUrl ?? null,
      title: data.title ?? `Auftrag · ${data.platform}`,
      orderType: data.orderType,
    });
    return NextResponse.json(apiSuccess({ order }), { status: 201 });
  }

  const action = await upsertHitAction({
    userId,
    sourceModule: data.sourceModule,
    analysisId: data.analysisId ?? null,
    platform: data.platform,
    profileUrl: data.profileUrl ?? null,
    title: data.title,
    action: data.kind,
  });
  return NextResponse.json(apiSuccess({ action }), { status: 201 });
}
