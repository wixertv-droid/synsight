import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  createSynSightOrder,
  listIgnoredFingerprints,
  upsertHitAction,
} from "@/lib/services/username-actions-service";

const actionSchema = z.object({
  kind: z.enum(["ignored", "self", "ordered"]),
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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Nicht angemeldet."), {
      status: 401,
    });
  }
  const ignored = await listIgnoredFingerprints(Number(user.id));
  return NextResponse.json(apiSuccess({ ignoredFingerprints: [...ignored] }));
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

  if (data.kind === "ordered") {
    if (!data.orderType) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", "orderType fehlt für SynSight-Auftrag."),
        { status: 400 }
      );
    }
    const order = await createSynSightOrder({
      userId,
      platform: data.platform,
      profileUrl: data.profileUrl ?? null,
      title: data.title ?? `Auftrag · ${data.platform}`,
      orderType: data.orderType,
    });
    return NextResponse.json(apiSuccess({ order }), { status: 201 });
  }

  const action = await upsertHitAction({
    userId,
    analysisId: data.analysisId ?? null,
    platform: data.platform,
    profileUrl: data.profileUrl ?? null,
    title: data.title,
    action: data.kind,
  });
  return NextResponse.json(apiSuccess({ action }), { status: 201 });
}
