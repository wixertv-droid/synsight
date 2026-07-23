import { eq, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import { searchProviderSettings } from "@/lib/database/schema";
import { SerpApiProvider } from "@/lib/search/providers/serpapi-provider";
import type { SearchProviderId } from "@/lib/search/types";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/lib/security/secret-vault";

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function mysqlTimestampNow(): string {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function asDateString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.slice(0, 10) || null;
}

export interface SearchProviderPublicSettings {
  provider: SearchProviderId;
  label: string;
  enabled: boolean;
  configured: boolean;
  maskedKey: string | null;
  status: string;
  lastCheckAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  averageResponseTimeMs: number;
  dailyRequests: number;
  totalRequests: number;
  totalErrors: number;
  errorRatePercent: number;
  apiVersion: string | null;
}

export interface SearchProviderStatusOverview {
  provider: SearchProviderId;
  online: boolean;
  status: string;
  lastSuccessAt: string | null;
  lastCheckAt: string | null;
  dailyRequests: number;
  totalRequests: number;
  totalErrors: number;
  errorRatePercent: number;
  averageResponseTimeMs: number;
  apiVersion: string | null;
  configured: boolean;
}

function providerLabel(provider: string): string {
  if (provider === "serpapi") return "SerpAPI";
  if (provider === "dataforseo") return "DataForSEO";
  if (provider === "bing") return "Bing Search";
  return provider;
}

async function ensureProviderRow(provider: SearchProviderId) {
  const db = getDatabase();
  if (!db) return null;

  const existing = await db
    .select()
    .from(searchProviderSettings)
    .where(eq(searchProviderSettings.provider, provider))
    .limit(1);
  if (existing[0]) return existing[0];

  await db.insert(searchProviderSettings).values({
    provider,
    enabled: true,
    status: "unknown",
  });

  const rows = await db
    .select()
    .from(searchProviderSettings)
    .where(eq(searchProviderSettings.provider, provider))
    .limit(1);
  return rows[0] ?? null;
}

function toPublic(
  row: typeof searchProviderSettings.$inferSelect
): SearchProviderPublicSettings {
  let maskedKey: string | null = null;
  let configured = false;
  if (row.encryptedApiKey) {
    configured = true;
    try {
      maskedKey = maskSecret(decryptSecret(row.encryptedApiKey));
    } catch {
      maskedKey = "••••••••";
    }
  }

  const totalRequests = Number(row.totalRequests) || 0;
  const totalErrors = Number(row.totalErrors) || 0;
  const errorRatePercent =
    totalRequests > 0
      ? Math.round((totalErrors / totalRequests) * 1000) / 10
      : 0;

  const dailyDate = asDateString(row.dailyRequestsDate);
  const dailyRequests =
    dailyDate === todayDateString() ? Number(row.dailyRequests) || 0 : 0;

  return {
    provider: row.provider as SearchProviderId,
    label: providerLabel(row.provider),
    enabled: row.enabled,
    configured,
    maskedKey,
    status: row.status,
    lastCheckAt: row.lastCheckAt,
    lastSuccessAt: row.lastSuccessAt,
    lastErrorAt: row.lastErrorAt,
    lastErrorMessage: row.lastErrorMessage,
    averageResponseTimeMs: row.averageResponseTimeMs,
    dailyRequests,
    totalRequests,
    totalErrors,
    errorRatePercent,
    apiVersion: row.apiVersion,
  };
}

export async function resolveSearchProviderApiKey(
  provider: SearchProviderId = "serpapi"
): Promise<string | null> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(searchProviderSettings)
        .where(eq(searchProviderSettings.provider, provider))
        .limit(1);
      const row = rows[0];
      if (row?.enabled && row.encryptedApiKey) {
        const key = decryptSecret(row.encryptedApiKey).trim();
        if (key) return key;
      }
    } catch (error) {
      console.error("[search-provider] resolve key failed", error);
    }
  }

  if (provider === "serpapi") {
    return process.env.SERPAPI_API_KEY?.trim() || null;
  }
  return null;
}

export async function isSearchProviderConfigured(
  provider: SearchProviderId = "serpapi"
): Promise<boolean> {
  return Boolean(await resolveSearchProviderApiKey(provider));
}

export async function getSearchProviderSettings(
  actor: AuthenticatedUser,
  provider: SearchProviderId = "serpapi"
): Promise<SearchProviderPublicSettings> {
  assertAdmin(actor);
  const row = await ensureProviderRow(provider);
  if (!row) {
    return {
      provider,
      label: providerLabel(provider),
      enabled: true,
      configured: Boolean(process.env.SERPAPI_API_KEY?.trim()),
      maskedKey: process.env.SERPAPI_API_KEY
        ? maskSecret(process.env.SERPAPI_API_KEY.trim())
        : null,
      status: "unknown",
      lastCheckAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      averageResponseTimeMs: 0,
      dailyRequests: 0,
      totalRequests: 0,
      totalErrors: 0,
      errorRatePercent: 0,
      apiVersion: null,
    };
  }
  return toPublic(row);
}

export async function getSearchProviderStatusOverview(
  actor?: AuthenticatedUser
): Promise<SearchProviderStatusOverview> {
  if (actor) assertAdmin(actor);
  const settings = actor
    ? await getSearchProviderSettings(actor, "serpapi")
    : await (async () => {
        const row = await ensureProviderRow("serpapi");
        return row
          ? toPublic(row)
          : ({
              provider: "serpapi" as const,
              configured: Boolean(process.env.SERPAPI_API_KEY?.trim()),
              status: "unknown",
              lastSuccessAt: null,
              lastCheckAt: null,
              dailyRequests: 0,
              totalRequests: 0,
              totalErrors: 0,
              errorRatePercent: 0,
              averageResponseTimeMs: 0,
              apiVersion: null,
            } satisfies Partial<SearchProviderPublicSettings> as SearchProviderPublicSettings);
      })();

  return {
    provider: "serpapi",
    online: settings.status === "online",
    status: settings.status,
    lastSuccessAt: settings.lastSuccessAt,
    lastCheckAt: settings.lastCheckAt,
    dailyRequests: settings.dailyRequests,
    totalRequests: settings.totalRequests,
    totalErrors: settings.totalErrors,
    errorRatePercent: settings.errorRatePercent,
    averageResponseTimeMs: settings.averageResponseTimeMs,
    apiVersion: settings.apiVersion,
    configured: settings.configured,
  };
}

export async function saveSearchProviderApiKey(
  actor: AuthenticatedUser,
  input: {
    provider: SearchProviderId;
    apiKey: string;
    enabled?: boolean;
  }
): Promise<SearchProviderPublicSettings> {
  assertAdmin(actor);
  const apiKey = input.apiKey.trim();
  if (apiKey.length < 8) {
    throw new Error("API_KEY_REQUIRED");
  }
  if (input.provider !== "serpapi") {
    throw new Error("PROVIDER_NOT_SUPPORTED");
  }

  const db = getDatabase();
  const adminId = Number(actor.id);
  const encrypted = encryptSecret(apiKey);

  if (!db) {
    return {
      provider: "serpapi",
      label: "SerpAPI",
      enabled: input.enabled ?? true,
      configured: true,
      maskedKey: maskSecret(apiKey),
      status: "unknown",
      lastCheckAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      averageResponseTimeMs: 0,
      dailyRequests: 0,
      totalRequests: 0,
      totalErrors: 0,
      errorRatePercent: 0,
      apiVersion: null,
    };
  }

  await ensureProviderRow("serpapi");
  await db
    .update(searchProviderSettings)
    .set({
      encryptedApiKey: encrypted,
      enabled: input.enabled ?? true,
      updatedByAdminId: adminId,
    })
    .where(eq(searchProviderSettings.provider, "serpapi"));

  return getSearchProviderSettings(actor, "serpapi");
}

export async function recordSearchProviderRequest(input: {
  provider: SearchProviderId;
  ok: boolean;
  latencyMs: number;
  errorMessage?: string | null;
  apiVersion?: string | null;
  eventType?: string;
  query?: string | null;
  referenceKey?: string | null;
  userId?: number | null;
  requestCount?: number;
  /** When false, only updates provider metrics — finance is recorded elsewhere. */
  recordFinance?: boolean;
}): Promise<void> {
  const requestCount = Math.max(1, input.requestCount ?? 1);
  const eventType = input.eventType ?? (input.ok ? "search" : "search_error");
  const queryDetail = input.query?.trim() || null;
  const referenceKey = input.referenceKey ?? `${input.provider}:${Date.now()}`;

  // Finance first — must not depend on metrics update succeeding.
  if (input.recordFinance !== false) {
    try {
      const { recordApiUsageEvent } =
        await import("@/lib/services/finance-service");
      await recordApiUsageEvent({
        providerCode: input.provider,
        eventType,
        referenceKey,
        userId: input.userId ?? null,
        requestCount,
        success: input.ok,
        detail: input.ok
          ? queryDetail
            ? `Query · ${queryDetail} · ${input.latencyMs} ms`
            : `Latenz ${input.latencyMs} ms`
          : (input.errorMessage ?? "Fehler"),
        metaJson: {
          latencyMs: input.latencyMs,
          apiVersion: input.apiVersion ?? null,
          query: queryDetail,
        },
      });
    } catch (error) {
      console.error("[search-provider] finance record failed", error);
    }
  }

  const db = getDatabase();
  if (!db) return;

  try {
    const row = await ensureProviderRow(input.provider);
    if (!row) return;

    const today = todayDateString();
    const dailyDate = asDateString(row.dailyRequestsDate);
    const sameDay = dailyDate === today;
    const now = mysqlTimestampNow();

    await db
      .update(searchProviderSettings)
      .set({
        lastCheckAt: now,
        lastSuccessAt: input.ok ? now : row.lastSuccessAt,
        lastErrorAt: input.ok ? row.lastErrorAt : now,
        lastErrorMessage: input.ok
          ? null
          : (input.errorMessage ?? "Unbekannter Fehler").slice(0, 1000),
        status: input.ok ? "online" : "offline",
        averageResponseTimeMs: sql`CASE
          WHEN COALESCE(${searchProviderSettings.totalRequests}, 0) = 0
          THEN ${Math.max(0, input.latencyMs)}
          ELSE ROUND(
            (
              COALESCE(${searchProviderSettings.averageResponseTimeMs}, 0) * COALESCE(${searchProviderSettings.totalRequests}, 0)
              + ${Math.max(0, input.latencyMs)}
            ) / (COALESCE(${searchProviderSettings.totalRequests}, 0) + ${requestCount})
          )
        END`,
        dailyRequests: sameDay
          ? sql`COALESCE(${searchProviderSettings.dailyRequests}, 0) + ${requestCount}`
          : requestCount,
        dailyRequestsDate: today,
        totalRequests: sql`COALESCE(${searchProviderSettings.totalRequests}, 0) + ${requestCount}`,
        ...(input.ok
          ? {}
          : {
              totalErrors: sql`COALESCE(${searchProviderSettings.totalErrors}, 0) + 1`,
            }),
        apiVersion: input.apiVersion ?? row.apiVersion,
      })
      .where(eq(searchProviderSettings.provider, input.provider));
  } catch (error) {
    console.error("[search-provider] metrics record failed", error);
  }
}

export async function testSearchProviderConnection(
  actor: AuthenticatedUser,
  input?: { provider?: SearchProviderId; apiKey?: string | null }
): Promise<{
  ok: boolean;
  message: string;
  detail?: string;
  latencyMs: number;
  apiVersion?: string | null;
  googleSearchOnline?: boolean;
  settings: SearchProviderPublicSettings;
}> {
  assertAdmin(actor);
  const provider = input?.provider ?? "serpapi";
  if (provider !== "serpapi") {
    return {
      ok: false,
      message: "Provider noch nicht freigeschaltet",
      detail: "Aktuell ist nur SerpAPI verfügbar.",
      latencyMs: 0,
      settings: await getSearchProviderSettings(actor, "serpapi"),
    };
  }

  const draftKey = input?.apiKey?.trim() || "";
  const apiKey = draftKey || (await resolveSearchProviderApiKey("serpapi"));
  if (!apiKey) {
    return {
      ok: false,
      message: "Ungültiger API-Key",
      detail: "Bitte zuerst einen SerpAPI-Key speichern.",
      latencyMs: 0,
      settings: await getSearchProviderSettings(actor, "serpapi"),
    };
  }

  const client = new SerpApiProvider(apiKey);
  const health = await client.healthCheck();
  await recordSearchProviderRequest({
    provider: "serpapi",
    ok: health.ok,
    latencyMs: health.latencyMs,
    errorMessage: health.ok ? null : health.detail || health.message,
    apiVersion: health.apiVersion,
    eventType: "health_check",
  });
  if (health.ok) {
    void refreshSerpApiAccountCacheQuietly();
  }

  return {
    ok: health.ok,
    message: health.message,
    detail: health.detail,
    latencyMs: health.latencyMs,
    apiVersion: health.apiVersion,
    googleSearchOnline: health.googleSearchOnline,
    settings: await getSearchProviderSettings(actor, "serpapi"),
  };
}

/** Runtime search used by Google analysis — records metrics. */
export async function searchViaActiveProvider(
  query: string,
  options?: {
    recordFinance?: boolean;
    userId?: number | null;
    referenceKey?: string | null;
    eventType?: string;
  }
): Promise<
  Array<{
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
  }>
> {
  const apiKey = await resolveSearchProviderApiKey("serpapi");
  if (!apiKey || !query.trim()) return [];

  const provider = new SerpApiProvider(apiKey);
  const started = Date.now();
  const referenceKey = options?.referenceKey ?? `serpapi-search:${Date.now()}`;
  try {
    const hits = await provider.search(query, { num: 10 });
    await recordSearchProviderRequest({
      provider: "serpapi",
      ok: true,
      latencyMs: Date.now() - started,
      apiVersion: "serpapi",
      eventType: options?.eventType ?? "search",
      query,
      referenceKey,
      userId: options?.userId ?? null,
      requestCount: 1,
      recordFinance: options?.recordFinance,
    });
    void refreshSerpApiAccountCacheQuietly();
    return hits.map((hit) => ({
      title: hit.title,
      link: hit.link,
      snippet: hit.snippet,
      displayLink: hit.displayLink,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "search failed";
    await recordSearchProviderRequest({
      provider: "serpapi",
      ok: false,
      latencyMs: Date.now() - started,
      errorMessage: message,
      eventType: options?.eventType ?? "search_error",
      query,
      referenceKey,
      userId: options?.userId ?? null,
      requestCount: 1,
      // Fehler kosten bei SerpAPI 0 Credits — Event nur bei expliziter Finance.
      recordFinance: options?.recordFinance,
    });
    console.error("[search-provider] search failed", message);
    // Re-throw, damit Google-Analyse fehlgeschlagene Queries nicht als Erfolg zählt.
    throw error instanceof Error ? error : new Error(message);
  }
}

const ACCOUNT_CACHE_TTL_MS = 10 * 60 * 1000;

export interface SerpApiAccountSnapshot {
  accountId: string | null;
  accountEmail: string | null;
  planName: string | null;
  planMonthlyPrice: number;
  searchesPerMonth: number;
  planSearchesLeft: number;
  totalSearchesLeft: number;
  thisMonthUsage: number;
  accountRateLimitPerHour: number;
  estimatedMonthSpendUsd: number;
  fetchedAt: string;
  stale: boolean;
  source: "live" | "cache";
}

function parseConfigObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toAccountSnapshot(
  raw: Record<string, unknown>,
  fetchedAt: string,
  source: "live" | "cache",
  stale = false
): SerpApiAccountSnapshot {
  const planMonthlyPrice = Number(raw.plan_monthly_price ?? 0) || 0;
  const searchesPerMonth = Number(raw.searches_per_month ?? 0) || 0;
  const thisMonthUsage = Number(raw.this_month_usage ?? 0) || 0;
  const estimatedMonthSpendUsd =
    searchesPerMonth > 0
      ? (thisMonthUsage / searchesPerMonth) * planMonthlyPrice
      : 0;

  return {
    accountId: typeof raw.account_id === "string" ? raw.account_id : null,
    accountEmail:
      typeof raw.account_email === "string" ? raw.account_email : null,
    planName: typeof raw.plan_name === "string" ? raw.plan_name : null,
    planMonthlyPrice,
    searchesPerMonth,
    planSearchesLeft: Number(raw.plan_searches_left ?? 0) || 0,
    totalSearchesLeft: Number(raw.total_searches_left ?? 0) || 0,
    thisMonthUsage,
    accountRateLimitPerHour: Number(raw.account_rate_limit_per_hour ?? 0) || 0,
    estimatedMonthSpendUsd: Math.round(estimatedMonthSpendUsd * 100) / 100,
    fetchedAt,
    stale,
    source,
  };
}

async function readCachedAccountSnapshot(): Promise<SerpApiAccountSnapshot | null> {
  const row = await ensureProviderRow("serpapi");
  if (!row) return null;
  const config = parseConfigObject(row.configJson);
  const cache = config.accountCache;
  if (!cache || typeof cache !== "object" || Array.isArray(cache)) return null;
  const payload = cache as Record<string, unknown>;
  const fetchedAt =
    typeof payload.fetchedAt === "string" ? payload.fetchedAt : null;
  const raw = payload.raw;
  if (!fetchedAt || !raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const age = Date.now() - new Date(fetchedAt).getTime();
  const stale = !Number.isFinite(age) || age > ACCOUNT_CACHE_TTL_MS;
  return toAccountSnapshot(
    raw as Record<string, unknown>,
    fetchedAt,
    "cache",
    stale
  );
}

async function writeAccountCache(raw: Record<string, unknown>): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  const row = await ensureProviderRow("serpapi");
  if (!row) return;
  const config = parseConfigObject(row.configJson);
  const fetchedAt = new Date().toISOString();
  config.accountCache = { fetchedAt, raw };
  await db
    .update(searchProviderSettings)
    .set({ configJson: config })
    .where(eq(searchProviderSettings.provider, "serpapi"));
}

/**
 * Free SerpAPI Account API — does not consume search credits.
 * Results are cached ~10 minutes in search_provider_settings.config_json.
 */
export async function getSerpApiAccountSnapshot(
  actor: AuthenticatedUser,
  options?: { forceRefresh?: boolean }
): Promise<SerpApiAccountSnapshot | null> {
  assertAdmin(actor);

  if (!options?.forceRefresh) {
    const cached = await readCachedAccountSnapshot();
    if (cached && !cached.stale) return cached;
  }

  const apiKey = await resolveSearchProviderApiKey("serpapi");
  if (!apiKey) {
    const cached = await readCachedAccountSnapshot();
    return cached;
  }

  try {
    const response = await fetch(
      `https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`,
      { method: "GET", cache: "no-store" }
    );
    if (!response.ok) {
      console.error("[search-provider] account api failed", response.status);
      return (await readCachedAccountSnapshot()) ?? null;
    }
    const raw = (await response.json()) as Record<string, unknown>;
    await writeAccountCache(raw);
    return toAccountSnapshot(raw, new Date().toISOString(), "live", false);
  } catch (error) {
    console.error("[search-provider] account api error", error);
    return (await readCachedAccountSnapshot()) ?? null;
  }
}

/** Best-effort refresh after searches — never throws to callers. */
export async function refreshSerpApiAccountCacheQuietly(): Promise<void> {
  try {
    const apiKey = await resolveSearchProviderApiKey("serpapi");
    if (!apiKey) return;
    const response = await fetch(
      `https://serpapi.com/account.json?api_key=${encodeURIComponent(apiKey)}`,
      { method: "GET", cache: "no-store" }
    );
    if (!response.ok) return;
    const raw = (await response.json()) as Record<string, unknown>;
    await writeAccountCache(raw);
  } catch (error) {
    console.error("[search-provider] quiet account refresh failed", error);
  }
}
