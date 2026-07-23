import { desc, eq, gte, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import {
  apiCostSettings,
  apiUsageEvents,
  invoices,
  paymentProviders,
  payments,
} from "@/lib/database/schema";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/security/secret-vault";

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return 0;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export interface PaymentProviderPublic {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  supportsCheckout: boolean;
  environment: string;
  notes: string | null;
  configured: boolean;
  maskedApiKey: string | null;
  hasWebhookSecret: boolean;
  configJson: unknown;
}

export type ApiBillingMode = "per_request" | "per_token";

export interface ApiTokenUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount?: number;
}

export interface ApiCostSettingPublic {
  id: number;
  providerCode: string;
  label: string;
  costPerRequestEur: number;
  billingMode: ApiBillingMode;
  costPer1mInputTokensEur: number;
  costPer1mOutputTokensEur: number;
  currency: string;
  isActive: boolean;
  notes: string | null;
}

export interface ApiUsageEventPublic {
  id: number;
  providerCode: string;
  eventType: string;
  referenceKey: string | null;
  userId: number | null;
  requestCount: number;
  unitCostEur: number;
  totalCostEur: number;
  success: boolean;
  detail: string | null;
  metaJson: unknown;
  createdAt: string;
}

export interface FinanceOverview {
  incomeEur: number;
  expenseEur: number;
  balanceEur: number;
  incomeLabel: string;
  expenseLabel: string;
  balanceLabel: string;
  paymentsCount: number;
  apiCallsToday: number;
  apiCallsTotal: number;
  dailySeries: Array<{ date: string; income: number; expense: number }>;
  expenseByProvider: Array<{
    providerCode: string;
    label: string;
    totalCostEur: number;
    requestCount: number;
  }>;
  incomeByProvider: Array<{
    provider: string;
    totalEur: number;
    count: number;
  }>;
}

export async function listPaymentProviders(
  actor: AuthenticatedUser
): Promise<PaymentProviderPublic[]> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) return [];

  const rows = await db.select().from(paymentProviders);
  return rows.map((row) => {
    let maskedApiKey: string | null = null;
    let configured = false;
    if (row.encryptedApiKey) {
      configured = true;
      try {
        maskedApiKey = maskSecret(decryptSecret(row.encryptedApiKey));
      } catch {
        maskedApiKey = "••••••••";
      }
    }
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      isActive: row.isActive,
      supportsCheckout: row.supportsCheckout,
      environment: row.environment ?? "test",
      notes: row.notes,
      configured,
      maskedApiKey,
      hasWebhookSecret: Boolean(row.encryptedWebhookSecret),
      configJson: row.configJson,
    };
  });
}

export async function upsertPaymentProvider(
  actor: AuthenticatedUser,
  input: {
    code: string;
    name: string;
    isActive?: boolean;
    supportsCheckout?: boolean;
    environment?: string;
    notes?: string | null;
    apiKey?: string | null;
    webhookSecret?: string | null;
  }
): Promise<PaymentProviderPublic> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const code = input.code.trim().toLowerCase().replace(/\s+/g, "_");
  if (!code || !input.name.trim()) throw new Error("VALIDATION_ERROR");

  const existing = await db
    .select()
    .from(paymentProviders)
    .where(eq(paymentProviders.code, code))
    .limit(1);

  const apiKey = input.apiKey?.trim();
  const webhookSecret = input.webhookSecret?.trim();

  if (existing[0]) {
    await db
      .update(paymentProviders)
      .set({
        name: input.name.trim(),
        isActive: input.isActive ?? existing[0].isActive,
        supportsCheckout:
          input.supportsCheckout ?? existing[0].supportsCheckout,
        environment: input.environment ?? existing[0].environment ?? "test",
        notes: input.notes ?? existing[0].notes,
        encryptedApiKey: apiKey
          ? encryptSecret(apiKey)
          : existing[0].encryptedApiKey,
        encryptedWebhookSecret: webhookSecret
          ? encryptSecret(webhookSecret)
          : existing[0].encryptedWebhookSecret,
      })
      .where(eq(paymentProviders.code, code));
  } else {
    await db.insert(paymentProviders).values({
      code,
      name: input.name.trim(),
      isActive: input.isActive ?? false,
      supportsCheckout: input.supportsCheckout ?? true,
      environment: input.environment ?? "test",
      notes: input.notes ?? null,
      encryptedApiKey: apiKey ? encryptSecret(apiKey) : null,
      encryptedWebhookSecret: webhookSecret
        ? encryptSecret(webhookSecret)
        : null,
    });
  }

  const list = await listPaymentProviders(actor);
  const row = list.find((item) => item.code === code);
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function listApiCostSettings(
  actor: AuthenticatedUser
): Promise<ApiCostSettingPublic[]> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) return [];
  const rows = await db.select().from(apiCostSettings);
  return rows.map((row) => mapApiCostSetting(row));
}

function normalizeBillingMode(value: unknown): ApiBillingMode {
  return value === "per_token" ? "per_token" : "per_request";
}

function mapApiCostSetting(
  row: typeof apiCostSettings.$inferSelect
): ApiCostSettingPublic {
  return {
    id: row.id,
    providerCode: row.providerCode,
    label: row.label,
    costPerRequestEur: toNumber(row.costPerRequestEur),
    billingMode: normalizeBillingMode(row.billingMode),
    costPer1mInputTokensEur: toNumber(row.costPer1mInputTokensEur),
    costPer1mOutputTokensEur: toNumber(row.costPer1mOutputTokensEur),
    currency: row.currency,
    isActive: row.isActive,
    notes: row.notes,
  };
}

/**
 * Live-Kosten aus usageMetadata.
 * Admin speichert €/1M (Defaults = gemini-3.6-flash Standard $1.50/$7.50 × 0.92).
 * Formel analog USD: (prompt/1M)×InputPreis + (candidates/1M)×OutputPreis
 */
export function calculateTokenCostEur(
  usage: ApiTokenUsage,
  inputPricePer1mEur: number,
  outputPricePer1mEur: number
): number {
  const prompt = Math.max(0, usage.promptTokenCount || 0);
  const candidates = Math.max(0, usage.candidatesTokenCount || 0);
  const inputCost = (prompt / 1_000_000) * Math.max(0, inputPricePer1mEur);
  const outputCost =
    (candidates / 1_000_000) * Math.max(0, outputPricePer1mEur);
  return inputCost + outputCost;
}

/** Offizielle gemini-3.6-flash Standard-Preise (USD) und EUR-Kurs für Defaults. */
export const GEMINI_36_FLASH_STANDARD_USD = {
  inputPer1m: 1.5,
  outputPer1m: 7.5,
} as const;
export const USD_TO_EUR = 0.92;

export async function upsertApiCostSetting(
  actor: AuthenticatedUser,
  input: {
    providerCode: string;
    label: string;
    costPerRequestEur: number;
    billingMode?: ApiBillingMode;
    costPer1mInputTokensEur?: number;
    costPer1mOutputTokensEur?: number;
    notes?: string | null;
    isActive?: boolean;
  }
): Promise<ApiCostSettingPublic> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const providerCode = input.providerCode.trim().toLowerCase();
  const cost = Math.max(0, input.costPerRequestEur);
  const billingMode = normalizeBillingMode(input.billingMode);
  const inputTokenCost = Math.max(0, input.costPer1mInputTokensEur ?? 0);
  const outputTokenCost = Math.max(0, input.costPer1mOutputTokensEur ?? 0);
  const adminId = Number(actor.id);

  await db
    .insert(apiCostSettings)
    .values({
      providerCode,
      label: input.label.trim() || providerCode,
      costPerRequestEur: cost.toFixed(6),
      billingMode,
      costPer1mInputTokensEur: inputTokenCost.toFixed(6),
      costPer1mOutputTokensEur: outputTokenCost.toFixed(6),
      notes: input.notes ?? null,
      isActive: input.isActive ?? true,
      updatedByAdminId: adminId,
    })
    .onDuplicateKeyUpdate({
      set: {
        label: input.label.trim() || providerCode,
        costPerRequestEur: cost.toFixed(6),
        billingMode,
        costPer1mInputTokensEur: inputTokenCost.toFixed(6),
        costPer1mOutputTokensEur: outputTokenCost.toFixed(6),
        notes: input.notes ?? null,
        isActive: input.isActive ?? true,
        updatedByAdminId: adminId,
      },
    });

  const list = await listApiCostSettings(actor);
  const row = list.find((item) => item.providerCode === providerCode);
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function recordApiUsageEvent(input: {
  providerCode: string;
  eventType: string;
  referenceKey?: string | null;
  userId?: number | null;
  requestCount?: number;
  success?: boolean;
  detail?: string | null;
  metaJson?: unknown;
  /** Gemini/OpenAI-style token usage for per_token billing. */
  tokenUsage?: ApiTokenUsage | null;
}): Promise<void> {
  const db = getDatabase();
  if (!db) return;

  try {
    const providerCode = input.providerCode.trim().toLowerCase();
    const requestCount = Math.max(1, input.requestCount ?? 1);
    const settings = await db
      .select()
      .from(apiCostSettings)
      .where(eq(apiCostSettings.providerCode, providerCode))
      .limit(1);
    const setting = settings[0];
    const billingMode = normalizeBillingMode(setting?.billingMode);
    const perRequest = toNumber(setting?.costPerRequestEur);
    const inputPer1m = toNumber(setting?.costPer1mInputTokensEur);
    const outputPer1m = toNumber(setting?.costPer1mOutputTokensEur);

    const tokenUsage = input.tokenUsage
      ? {
          promptTokenCount: Math.max(0, input.tokenUsage.promptTokenCount || 0),
          candidatesTokenCount: Math.max(
            0,
            input.tokenUsage.candidatesTokenCount || 0
          ),
          totalTokenCount: Math.max(
            0,
            input.tokenUsage.totalTokenCount ??
              (input.tokenUsage.promptTokenCount || 0) +
                (input.tokenUsage.candidatesTokenCount || 0)
          ),
        }
      : null;

    let unitCost = perRequest;
    let totalCost = perRequest * requestCount;

    if (billingMode === "per_token" && tokenUsage) {
      totalCost = calculateTokenCostEur(tokenUsage, inputPer1m, outputPer1m);
      unitCost = requestCount > 0 ? totalCost / requestCount : totalCost;
    }

    const baseMeta =
      input.metaJson &&
      typeof input.metaJson === "object" &&
      !Array.isArray(input.metaJson)
        ? (input.metaJson as Record<string, unknown>)
        : {};

    const metaJson = {
      ...baseMeta,
      billingMode,
      ...(tokenUsage
        ? {
            usageMetadata: {
              promptTokenCount: tokenUsage.promptTokenCount,
              candidatesTokenCount: tokenUsage.candidatesTokenCount,
              totalTokenCount: tokenUsage.totalTokenCount,
            },
            tokenPricesEurPer1m: {
              input: inputPer1m,
              output: outputPer1m,
            },
            tokenPricesUsdPer1m:
              providerCode === "gemini"
                ? {
                    input: GEMINI_36_FLASH_STANDARD_USD.inputPer1m,
                    output: GEMINI_36_FLASH_STANDARD_USD.outputPer1m,
                    usdToEur: USD_TO_EUR,
                  }
                : undefined,
          }
        : {}),
    };

    await db.insert(apiUsageEvents).values({
      providerCode,
      eventType: input.eventType,
      referenceKey: input.referenceKey ?? null,
      userId: input.userId ?? null,
      requestCount,
      unitCostEur: unitCost.toFixed(6),
      totalCostEur: totalCost.toFixed(6),
      success: input.success ?? true,
      detail: input.detail?.slice(0, 500) ?? null,
      metaJson,
    });
  } catch (error) {
    console.error("[finance] recordApiUsageEvent failed", error);
  }
}

export async function listApiUsageEvents(
  actor: AuthenticatedUser,
  options?: { providerCode?: string; limit?: number }
): Promise<ApiUsageEventPublic[]> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) return [];

  const limit = Math.min(200, Math.max(1, options?.limit ?? 50));
  const rows = options?.providerCode
    ? await db
        .select()
        .from(apiUsageEvents)
        .where(eq(apiUsageEvents.providerCode, options.providerCode))
        .orderBy(desc(apiUsageEvents.createdAt))
        .limit(limit)
    : await db
        .select()
        .from(apiUsageEvents)
        .orderBy(desc(apiUsageEvents.createdAt))
        .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    providerCode: row.providerCode,
    eventType: row.eventType,
    referenceKey: row.referenceKey,
    userId: row.userId,
    requestCount: row.requestCount,
    unitCostEur: toNumber(row.unitCostEur),
    totalCostEur: toNumber(row.totalCostEur),
    success: row.success,
    detail: row.detail,
    metaJson: row.metaJson,
    createdAt: row.createdAt,
  }));
}

export async function getApiUsageEventDetail(
  actor: AuthenticatedUser,
  eventId: number
): Promise<ApiUsageEventPublic | null> {
  assertAdmin(actor);
  const db = getDatabase();
  if (!db) return null;
  const rows = await db
    .select()
    .from(apiUsageEvents)
    .where(eq(apiUsageEvents.id, eventId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    providerCode: row.providerCode,
    eventType: row.eventType,
    referenceKey: row.referenceKey,
    userId: row.userId,
    requestCount: row.requestCount,
    unitCostEur: toNumber(row.unitCostEur),
    totalCostEur: toNumber(row.totalCostEur),
    success: row.success,
    detail: row.detail,
    metaJson: row.metaJson,
    createdAt: row.createdAt,
  };
}

export async function getFinanceOverview(
  actor: AuthenticatedUser
): Promise<FinanceOverview> {
  assertAdmin(actor);
  const db = getDatabase();

  const empty: FinanceOverview = {
    incomeEur: 0,
    expenseEur: 0,
    balanceEur: 0,
    incomeLabel: formatEur(0),
    expenseLabel: formatEur(0),
    balanceLabel: formatEur(0),
    paymentsCount: 0,
    apiCallsToday: 0,
    apiCallsTotal: 0,
    dailySeries: [],
    expenseByProvider: [],
    incomeByProvider: [],
  };

  if (!db) return empty;

  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString().slice(0, 19).replace("T", " ");

  const today = new Date().toISOString().slice(0, 10);

  const [paymentRows, expenseRows, costLabels, todayCalls, totalCalls] =
    await Promise.all([
      db
        .select({
          provider: payments.provider,
          amountCents: payments.amountCents,
          amount: payments.amount,
          status: payments.status,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(gte(payments.createdAt, sinceIso)),
      db
        .select({
          providerCode: apiUsageEvents.providerCode,
          totalCostEur: apiUsageEvents.totalCostEur,
          requestCount: apiUsageEvents.requestCount,
          createdAt: apiUsageEvents.createdAt,
        })
        .from(apiUsageEvents)
        .where(gte(apiUsageEvents.createdAt, sinceIso)),
      db.select().from(apiCostSettings),
      db
        .select({
          count: sql<number>`COALESCE(SUM(${apiUsageEvents.requestCount}), 0)`,
        })
        .from(apiUsageEvents)
        .where(sql`DATE(${apiUsageEvents.createdAt}) = ${today}`),
      db
        .select({
          count: sql<number>`COALESCE(SUM(${apiUsageEvents.requestCount}), 0)`,
        })
        .from(apiUsageEvents),
    ]);

  let incomeEur = 0;
  const incomeByProviderMap = new Map<
    string,
    { total: number; count: number }
  >();
  for (const row of paymentRows) {
    const status = String(row.status);
    if (!/completed|paid|succeeded|success/i.test(status)) continue;
    const eur =
      row.amountCents != null
        ? Number(row.amountCents) / 100
        : toNumber(row.amount);
    if (!Number.isFinite(eur) || eur <= 0) continue;
    incomeEur += eur;
    const key = row.provider || "manual";
    const current = incomeByProviderMap.get(key) ?? { total: 0, count: 0 };
    current.total += eur;
    current.count += 1;
    incomeByProviderMap.set(key, current);
  }

  if (incomeEur === 0) {
    try {
      const invoiceRows = await db
        .select({
          amountCents: invoices.amountCents,
          createdAt: invoices.createdAt,
          status: invoices.status,
        })
        .from(invoices)
        .where(gte(invoices.createdAt, sinceIso));
      for (const row of invoiceRows) {
        if (!/paid|succeeded|completed/i.test(String(row.status))) continue;
        const eur = Number(row.amountCents || 0) / 100;
        if (eur <= 0) continue;
        incomeEur += eur;
        const current = incomeByProviderMap.get("invoice") ?? {
          total: 0,
          count: 0,
        };
        current.total += eur;
        current.count += 1;
        incomeByProviderMap.set("invoice", current);
      }
    } catch {
      /* invoices optional */
    }
  }

  let expenseEur = 0;
  const expenseByProviderMap = new Map<
    string,
    { total: number; requests: number }
  >();
  for (const row of expenseRows) {
    const cost = toNumber(row.totalCostEur);
    expenseEur += cost;
    const current = expenseByProviderMap.get(row.providerCode) ?? {
      total: 0,
      requests: 0,
    };
    current.total += cost;
    current.requests += Number(row.requestCount) || 0;
    expenseByProviderMap.set(row.providerCode, current);
  }

  const labelMap = new Map(
    costLabels.map((row) => [row.providerCode, row.label] as const)
  );

  const dayKeys: string[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }

  const dailyMap = new Map(
    dayKeys.map((date) => [date, { income: 0, expense: 0 }])
  );

  for (const row of paymentRows) {
    const day = String(row.createdAt).slice(0, 10);
    const bucket = dailyMap.get(day);
    if (!bucket) continue;
    if (!/completed|paid|succeeded|success/i.test(String(row.status))) continue;
    const eur =
      row.amountCents != null
        ? Number(row.amountCents) / 100
        : toNumber(row.amount);
    bucket.income += eur;
  }
  for (const row of expenseRows) {
    const day = String(row.createdAt).slice(0, 10);
    const bucket = dailyMap.get(day);
    if (!bucket) continue;
    bucket.expense += toNumber(row.totalCostEur);
  }

  const balanceEur = incomeEur - expenseEur;

  return {
    incomeEur,
    expenseEur,
    balanceEur,
    incomeLabel: formatEur(incomeEur),
    expenseLabel: formatEur(expenseEur),
    balanceLabel: formatEur(balanceEur),
    paymentsCount: [...incomeByProviderMap.values()].reduce(
      (sum, item) => sum + item.count,
      0
    ),
    apiCallsToday: toNumber(todayCalls[0]?.count),
    apiCallsTotal: toNumber(totalCalls[0]?.count),
    dailySeries: dayKeys.map((date) => ({
      date,
      income: dailyMap.get(date)?.income ?? 0,
      expense: dailyMap.get(date)?.expense ?? 0,
    })),
    expenseByProvider: [...expenseByProviderMap.entries()].map(
      ([providerCode, value]) => ({
        providerCode,
        label: labelMap.get(providerCode) ?? providerCode,
        totalCostEur: value.total,
        requestCount: value.requests,
      })
    ),
    incomeByProvider: [...incomeByProviderMap.entries()].map(
      ([provider, value]) => ({
        provider,
        totalEur: value.total,
        count: value.count,
      })
    ),
  };
}
