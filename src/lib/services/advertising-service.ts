import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import {
  advertisingCampaigns,
  advertisingDailyMetrics,
} from "@/lib/database/schema";

export const AD_PLATFORMS = [
  "google_ads",
  "youtube",
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "x",
  "other",
] as const;

export type AdvertisingPlatform = (typeof AD_PLATFORMS)[number];

export type AdvertisingStatus =
  "draft" | "active" | "paused" | "completed" | "archived";

function assertAdmin(actor: AuthenticatedUser) {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function n(value: unknown): number {
  const result =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(result) ? result : 0;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export interface AdvertisingCampaignPublic {
  id: number;
  name: string;
  platform: string;
  externalCampaignId: string | null;
  externalAccountId: string | null;
  status: AdvertisingStatus;
  objective: string | null;
  landingUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  dailyBudgetEur: number;
  totalBudgetEur: number;
  targetCountry: string | null;
  targetRegion: string | null;
  targetAudience: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  spendEur: number;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValueEur: number;

  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  conversionRate: number;
  roas: number;
  budgetUsedPercent: number;
}

export interface AdvertisingOverview {
  totalCampaigns: number;
  activeCampaigns: number;

  totalBudgetEur: number;
  spendEur: number;
  remainingBudgetEur: number;

  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  conversionValueEur: number;

  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  conversionRate: number;
  roas: number;

  spendByPlatform: Array<{
    platform: string;
    spendEur: number;
    campaigns: number;
  }>;
}

function derive(input: {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  budget: number;
}) {
  return {
    ctr:
      input.impressions > 0
        ? round((input.clicks / input.impressions) * 100, 2)
        : 0,

    cpc: input.clicks > 0 ? round(input.spend / input.clicks, 4) : 0,

    cpm:
      input.impressions > 0
        ? round((input.spend / input.impressions) * 1000, 4)
        : 0,

    cpa: input.conversions > 0 ? round(input.spend / input.conversions, 4) : 0,

    conversionRate:
      input.clicks > 0 ? round((input.conversions / input.clicks) * 100, 2) : 0,

    roas: input.spend > 0 ? round(input.conversionValue / input.spend, 2) : 0,

    budgetUsedPercent:
      input.budget > 0 ? round((input.spend / input.budget) * 100, 2) : 0,
  };
}

export async function listAdvertisingCampaigns(
  actor: AuthenticatedUser
): Promise<AdvertisingCampaignPublic[]> {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) return [];

  const campaigns = await db
    .select()
    .from(advertisingCampaigns)
    .orderBy(desc(advertisingCampaigns.updatedAt));

  const metrics = await db.select().from(advertisingDailyMetrics);

  return campaigns.map((campaign) => {
    const rows = metrics.filter((row) => row.campaignId === campaign.id);

    const spend = rows.reduce((sum, row) => sum + n(row.spendEur), 0);
    const impressions = rows.reduce(
      (sum, row) => sum + Number(row.impressions || 0),
      0
    );
    const reach = rows.reduce((sum, row) => sum + Number(row.reach || 0), 0);
    const clicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    const conversions = rows.reduce((sum, row) => sum + n(row.conversions), 0);
    const conversionValue = rows.reduce(
      (sum, row) => sum + n(row.conversionValueEur),
      0
    );

    const totalBudget = n(campaign.totalBudgetEur);

    return {
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      externalCampaignId: campaign.externalCampaignId,
      externalAccountId: campaign.externalAccountId,
      status: campaign.status as AdvertisingStatus,
      objective: campaign.objective,
      landingUrl: campaign.landingUrl,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      dailyBudgetEur: n(campaign.dailyBudgetEur),
      totalBudgetEur: totalBudget,
      targetCountry: campaign.targetCountry,
      targetRegion: campaign.targetRegion,
      targetAudience: campaign.targetAudience,
      utmSource: campaign.utmSource,
      utmMedium: campaign.utmMedium,
      utmCampaign: campaign.utmCampaign,
      utmContent: campaign.utmContent,
      notes: campaign.notes,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,

      spendEur: round(spend),
      impressions,
      reach,
      clicks,
      conversions: round(conversions),
      conversionValueEur: round(conversionValue),

      ...derive({
        spend,
        impressions,
        clicks,
        conversions,
        conversionValue,
        budget: totalBudget,
      }),
    };
  });
}

export async function upsertAdvertisingCampaign(
  actor: AuthenticatedUser,
  input: {
    id?: number;
    name: string;
    platform: string;
    externalCampaignId?: string | null;
    externalAccountId?: string | null;
    status?: AdvertisingStatus;
    objective?: string | null;
    landingUrl?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    dailyBudgetEur?: number;
    totalBudgetEur?: number;
    targetCountry?: string | null;
    targetRegion?: string | null;
    targetAudience?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    notes?: string | null;
  }
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const adminId = Number.parseInt(actor.id, 10);

  const values = {
    name: input.name.trim(),
    platform: input.platform.trim().toLowerCase() || "other",
    externalCampaignId: input.externalCampaignId?.trim() || null,
    externalAccountId: input.externalAccountId?.trim() || null,
    status: input.status ?? "draft",
    objective: input.objective?.trim() || null,
    landingUrl: input.landingUrl?.trim() || null,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
    dailyBudgetEur: Math.max(0, input.dailyBudgetEur ?? 0).toFixed(2),
    totalBudgetEur: Math.max(0, input.totalBudgetEur ?? 0).toFixed(2),
    targetCountry: input.targetCountry?.trim() || null,
    targetRegion: input.targetRegion?.trim() || null,
    targetAudience: input.targetAudience?.trim() || null,
    utmSource: input.utmSource?.trim() || null,
    utmMedium: input.utmMedium?.trim() || null,
    utmCampaign: input.utmCampaign?.trim() || null,
    utmContent: input.utmContent?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    await db
      .update(advertisingCampaigns)
      .set(values)
      .where(eq(advertisingCampaigns.id, input.id));

    return input.id;
  }

  const result = await db.insert(advertisingCampaigns).values({
    ...values,
    createdByAdminId: Number.isFinite(adminId) ? adminId : null,
  });

  return Number(result[0].insertId);
}

export async function upsertAdvertisingDailyMetric(
  actor: AuthenticatedUser,
  input: {
    campaignId: number;
    metricDate: string;
    spendEur?: number;
    impressions?: number;
    reach?: number;
    clicks?: number;
    conversions?: number;
    conversionValueEur?: number;
    source?: string;
  }
) {
  assertAdmin(actor);

  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  await db
    .insert(advertisingDailyMetrics)
    .values({
      campaignId: input.campaignId,
      metricDate: input.metricDate,
      spendEur: Math.max(0, input.spendEur ?? 0).toFixed(4),
      impressions: Math.max(0, Math.round(input.impressions ?? 0)),
      reach: Math.max(0, Math.round(input.reach ?? 0)),
      clicks: Math.max(0, Math.round(input.clicks ?? 0)),
      conversions: Math.max(0, input.conversions ?? 0).toFixed(4),
      conversionValueEur: Math.max(0, input.conversionValueEur ?? 0).toFixed(4),
      source: input.source?.trim() || "manual",
    })
    .onDuplicateKeyUpdate({
      set: {
        spendEur: Math.max(0, input.spendEur ?? 0).toFixed(4),
        impressions: Math.max(0, Math.round(input.impressions ?? 0)),
        reach: Math.max(0, Math.round(input.reach ?? 0)),
        clicks: Math.max(0, Math.round(input.clicks ?? 0)),
        conversions: Math.max(0, input.conversions ?? 0).toFixed(4),
        conversionValueEur: Math.max(0, input.conversionValueEur ?? 0).toFixed(
          4
        ),
        source: input.source?.trim() || "manual",
      },
    });
}

export async function getAdvertisingOverview(
  actor: AuthenticatedUser
): Promise<AdvertisingOverview> {
  const campaigns = await listAdvertisingCampaigns(actor);

  const totalBudgetEur = campaigns.reduce(
    (sum, row) => sum + row.totalBudgetEur,
    0
  );
  const spendEur = campaigns.reduce((sum, row) => sum + row.spendEur, 0);
  const impressions = campaigns.reduce((sum, row) => sum + row.impressions, 0);
  const reach = campaigns.reduce((sum, row) => sum + row.reach, 0);
  const clicks = campaigns.reduce((sum, row) => sum + row.clicks, 0);
  const conversions = campaigns.reduce((sum, row) => sum + row.conversions, 0);
  const conversionValueEur = campaigns.reduce(
    (sum, row) => sum + row.conversionValueEur,
    0
  );

  const platformMap = new Map<
    string,
    { spendEur: number; campaigns: number }
  >();

  for (const row of campaigns) {
    const current = platformMap.get(row.platform) ?? {
      spendEur: 0,
      campaigns: 0,
    };
    current.spendEur += row.spendEur;
    current.campaigns += 1;
    platformMap.set(row.platform, current);
  }

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((row) => row.status === "active").length,

    totalBudgetEur: round(totalBudgetEur, 2),
    spendEur: round(spendEur, 2),
    remainingBudgetEur: round(Math.max(0, totalBudgetEur - spendEur), 2),

    impressions,
    reach,
    clicks,
    conversions: round(conversions),
    conversionValueEur: round(conversionValueEur, 2),

    ...derive({
      spend: spendEur,
      impressions,
      clicks,
      conversions,
      conversionValue: conversionValueEur,
      budget: totalBudgetEur,
    }),

    spendByPlatform: [...platformMap.entries()]
      .map(([platform, value]) => ({
        platform,
        spendEur: round(value.spendEur, 2),
        campaigns: value.campaigns,
      }))
      .sort((a, b) => b.spendEur - a.spendEur),
  };
}

export async function getAdvertisingSpendSince(sinceDate: string): Promise<{
  total: number;
  daily: Map<string, number>;
}> {
  const db = getDatabase();
  if (!db) return { total: 0, daily: new Map() };

  const rows = await db
    .select({
      metricDate: advertisingDailyMetrics.metricDate,
      spendEur: advertisingDailyMetrics.spendEur,
    })
    .from(advertisingDailyMetrics)
    .where(gte(advertisingDailyMetrics.metricDate, sinceDate));

  const daily = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    const value = n(row.spendEur);
    total += value;

    const day = String(row.metricDate).slice(0, 10);
    daily.set(day, (daily.get(day) ?? 0) + value);
  }

  return {
    total: round(total),
    daily,
  };
}
