import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import { validateMutationOrigin } from "@/lib/security/request";
import {
  getAdvertisingOverview,
  listAdvertisingCampaigns,
  upsertAdvertisingCampaign,
  upsertAdvertisingDailyMetric,
} from "@/lib/services/advertising-service";

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

const campaignSchema = z.object({
  action: z.literal("campaign"),
  id: z.number().int().positive().optional(),
  name: z.string().min(2).max(180),
  platform: z.string().min(2).max(64),

  externalCampaignId: z.string().max(255).nullable().optional(),
  externalAccountId: z.string().max(255).nullable().optional(),

  status: z
    .enum(["draft", "active", "paused", "completed", "archived"])
    .optional(),

  objective: z.string().max(120).nullable().optional(),
  landingUrl: z.string().max(500).nullable().optional(),

  startsAt: z.string().max(10).nullable().optional(),
  endsAt: z.string().max(10).nullable().optional(),

  dailyBudgetEur: z.number().min(0).max(1000000).optional(),
  totalBudgetEur: z.number().min(0).max(100000000).optional(),

  targetCountry: z.string().max(64).nullable().optional(),
  targetRegion: z.string().max(120).nullable().optional(),
  targetAudience: z.string().max(10000).nullable().optional(),

  utmSource: z.string().max(120).nullable().optional(),
  utmMedium: z.string().max(120).nullable().optional(),
  utmCampaign: z.string().max(180).nullable().optional(),
  utmContent: z.string().max(180).nullable().optional(),

  notes: z.string().max(20000).nullable().optional(),
});

const metricSchema = z.object({
  action: z.literal("metric"),
  campaignId: z.number().int().positive(),
  metricDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  spendEur: z.number().min(0).max(100000000).optional(),
  impressions: z.number().int().min(0).optional(),
  reach: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),

  conversions: z.number().min(0).optional(),
  conversionValueEur: z.number().min(0).optional(),

  source: z.string().max(32).optional(),
});

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const [campaigns, overview] = await Promise.all([
    listAdvertisingCampaigns(access.user),
    getAdvertisingOverview(access.user),
  ]);

  return NextResponse.json(
    apiSuccess({
      campaigns,
      overview,
    })
  );
}

export async function PUT(request: Request) {
  const originError = validateMutationOrigin(request);
  if (originError) return originError;

  const access = await getAdminAccess();
  if (!access.granted) return denied(access.status);

  const body = await request.json().catch(() => null);

  const campaign = campaignSchema.safeParse(body);

  if (campaign.success) {
    await upsertAdvertisingCampaign(access.user, campaign.data);

    return NextResponse.json(
      apiSuccess({
        campaigns: await listAdvertisingCampaigns(access.user),
        overview: await getAdvertisingOverview(access.user),
      })
    );
  }

  const metric = metricSchema.safeParse(body);

  if (metric.success) {
    await upsertAdvertisingDailyMetric(access.user, metric.data);

    return NextResponse.json(
      apiSuccess({
        campaigns: await listAdvertisingCampaigns(access.user),
        overview: await getAdvertisingOverview(access.user),
      })
    );
  }

  return NextResponse.json(
    apiError("VALIDATION_ERROR", "Ungültige Werbe- oder Kampagnendaten."),
    { status: 400 }
  );
}
