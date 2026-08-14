import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { analysisPricing, usernameModuleSettings } from "@/lib/database/schema";
import {
  DEFAULT_USERNAME_MODULE_SETTINGS,
  type UsernameModuleSettings,
} from "@/lib/analysis/username/types";
import { computeUsernameFinance } from "@/lib/analysis/username/finance";
import { ensureUsernameSchema } from "@/lib/analysis/username/ensure-schema";

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapRow(
  row: typeof usernameModuleSettings.$inferSelect | undefined
): UsernameModuleSettings {
  if (!row) return { ...DEFAULT_USERNAME_MODULE_SETTINGS };
  return {
    isActive: Boolean(row.isActive),
    apiEnabled: Boolean(row.apiEnabled),
    maxQueries: Math.min(8, Math.max(5, toNumber(row.maxQueries, 8))),
    countries: row.countries || "de",
    language: row.language || "de",
    resultLimit: Math.max(5, toNumber(row.resultLimit, 40)),
    confidenceMin: Math.min(100, Math.max(0, toNumber(row.confidenceMin, 60))),
    synCredits: Math.max(1, toNumber(row.synCredits, 10)),
    serpapiCostEur: Math.max(0, toNumber(row.serpapiCostEur, 0.023)),
    geminiCostEur: Math.max(0, toNumber(row.geminiCostEur, 0.002)),
    markupPercent: Math.max(0, toNumber(row.markupPercent, 100)),
    minProfitEur: Math.max(0, toNumber(row.minProfitEur, 0.05)),
    creditValueEur: Math.max(0, toNumber(row.creditValueEur, 0.01)),
  };
}

export async function getUsernameModuleSettings(): Promise<UsernameModuleSettings> {
  await ensureUsernameSchema();
  const db = getDatabase();
  if (!db) return { ...DEFAULT_USERNAME_MODULE_SETTINGS };

  try {
    const rows = await db
      .select()
      .from(usernameModuleSettings)
      .where(eq(usernameModuleSettings.id, 1))
      .limit(1);
    return mapRow(rows[0]);
  } catch (error) {
    console.error("[username-settings] read failed", error);
    return { ...DEFAULT_USERNAME_MODULE_SETTINGS };
  }
}

export async function updateUsernameModuleSettings(
  patch: Partial<UsernameModuleSettings>,
  adminId?: number | null
): Promise<UsernameModuleSettings> {
  await ensureUsernameSchema();
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const current = await getUsernameModuleSettings();
  const next: UsernameModuleSettings = {
    ...current,
    ...patch,
    maxQueries: Math.min(
      8,
      Math.max(5, toNumber(patch.maxQueries ?? current.maxQueries, 8))
    ),
    confidenceMin: Math.min(
      100,
      Math.max(0, toNumber(patch.confidenceMin ?? current.confidenceMin, 60))
    ),
    synCredits: Math.max(
      1,
      toNumber(patch.synCredits ?? current.synCredits, 10)
    ),
  };

  await db
    .insert(usernameModuleSettings)
    .values({
      id: 1,
      isActive: next.isActive,
      apiEnabled: next.apiEnabled,
      maxQueries: next.maxQueries,
      countries: next.countries,
      language: next.language,
      resultLimit: next.resultLimit,
      confidenceMin: next.confidenceMin,
      synCredits: next.synCredits,
      serpapiCostEur: String(next.serpapiCostEur),
      geminiCostEur: String(next.geminiCostEur),
      markupPercent: String(next.markupPercent),
      minProfitEur: String(next.minProfitEur),
      creditValueEur: String(next.creditValueEur),
      updatedByAdminId: adminId ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        isActive: next.isActive,
        apiEnabled: next.apiEnabled,
        maxQueries: next.maxQueries,
        countries: next.countries,
        language: next.language,
        resultLimit: next.resultLimit,
        confidenceMin: next.confidenceMin,
        synCredits: next.synCredits,
        serpapiCostEur: String(next.serpapiCostEur),
        geminiCostEur: String(next.geminiCostEur),
        markupPercent: String(next.markupPercent),
        minProfitEur: String(next.minProfitEur),
        creditValueEur: String(next.creditValueEur),
        updatedByAdminId: adminId ?? null,
      },
    });

  // Keep analysis_pricing in sync for AnalyseCenter / SynCredits
  try {
    await db
      .update(analysisPricing)
      .set({
        credits: next.synCredits,
        isActive: next.isActive,
        defaultCredits: next.synCredits,
      })
      .where(eq(analysisPricing.analysisKey, "username_intelligence"));
  } catch (error) {
    console.error("[username-settings] pricing sync failed", error);
  }

  return next;
}

export async function getUsernameFinanceSnapshot() {
  const settings = await getUsernameModuleSettings();
  return {
    settings,
    finance: await computeUsernameFinance(settings),
  };
}
