import type { IdentityView } from "@/lib/services/identity-service";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import {
  fetchGoogleSearch,
  isGoogleSearchConfigured,
} from "@/lib/analysis/google/custom-search";
import {
  confidenceBand,
  confidenceLabel,
  evaluateUsernameHit,
} from "@/lib/analysis/username/confidence";
import {
  detectPlatform,
  detectProblemTags,
} from "@/lib/analysis/username/platform-detect";
import { planUsernameQueries } from "@/lib/analysis/username/search-planner";
import {
  buildActionPlan,
  buildHeatmap,
  buildIdentityGraph,
  buildManagementOverview,
  buildSecurityOverview,
  buildIdentityFindings,
  sortHitsByRisk,
  splitPrimaryAndWeakHits,
  buildPlatformOverview,
  buildTimeline,
  computeIdentityScore,
  computeRiskScore,
} from "@/lib/analysis/username/report-metrics";
import {
  buildUsernameGeminiPayload,
  summarizeUsernameWithGemini,
} from "@/lib/analysis/username/gemini-prep";
import {
  createUsernameAnalysis,
  failUsernameAnalysis,
  persistUsernameAiReport,
  persistUsernameCostLog,
  persistUsernameReport,
} from "@/lib/analysis/username/repository";
import { getUsernameModuleSettings } from "@/lib/analysis/username/settings";
import { computeUsernameFinance } from "@/lib/analysis/username/finance";
import type {
  UsernameHit,
  UsernameReport,
  UsernameRiskLevel,
} from "@/lib/analysis/username/types";
import { recordApiUsageEvent } from "@/lib/services/finance-service";
import {
  computeExpiresAt,
  parseRetentionDays,
  type ReportRetentionDays,
} from "@/lib/analysis/retention";

export class UsernameIntelligenceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsernameIntelligenceUnavailableError";
  }
}

function extractYear(text: string): string | null {
  const match = text.match(/\b(20\d{2}|19\d{2})\b/);
  return match?.[1] ?? null;
}

function riskFromHit(
  confidence: number,
  problemTags: string[],
  category: string
): UsernameRiskLevel {
  if (problemTags.length > 0) return "high";
  if (
    ["Dating", "Gambling", "Darknet"].includes(category) ||
    confidence >= 90
  ) {
    return confidence >= 90 && problemTags.length === 0 ? "medium" : "high";
  }
  if (confidence >= 80) return "medium";
  return "low";
}

function dedupeKey(url: string, title: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return `${url}|${title}`.toLowerCase();
  }
}

function profileNameFrom(
  username: string,
  title: string,
  url: string
): string | null {
  if (title.toLowerCase().includes(username.toLowerCase())) {
    return username;
  }
  try {
    const path = new URL(url).pathname;
    const segment = path.split("/").filter(Boolean)[0];
    if (segment && segment.length <= 64) return decodeURIComponent(segment);
  } catch {
    /* ignore */
  }
  return username || null;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run())
  );
  return results;
}

export async function runUsernameIntelligenceScan(
  identity: IdentityView | null,
  options?: { userId?: number | null; retentionDays?: ReportRetentionDays }
): Promise<UsernameReport> {
  const settings = await getUsernameModuleSettings();
  if (!settings.isActive) {
    throw new UsernameIntelligenceUnavailableError(
      "Username Intelligence Scan ist deaktiviert."
    );
  }
  if (!settings.apiEnabled) {
    throw new UsernameIntelligenceUnavailableError(
      "Username Intelligence API ist deaktiviert."
    );
  }

  const apiConfigured = await isGoogleSearchConfigured();
  if (!apiConfigured) {
    throw new UsernameIntelligenceUnavailableError(
      "SerpAPI ist nicht konfiguriert. Bitte Administrator kontaktieren."
    );
  }

  const subjectName = resolveSubjectName(identity);
  const {
    username,
    usernames: scannedUsernames,
    queries,
  } = planUsernameQueries(identity, settings.maxQueries);
  if (!username || queries.length === 0) {
    throw new UsernameIntelligenceUnavailableError(
      "Kein Benutzername/Alias im Identitätsprofil hinterlegt."
    );
  }

  const userId = options?.userId ?? null;
  if (!userId) {
    throw new UsernameIntelligenceUnavailableError(
      "Benutzerkontext für die Analyse fehlt."
    );
  }

  const retentionDays = parseRetentionDays(options?.retentionDays);
  const generatedAt = new Date().toISOString();
  const expiresAt = computeExpiresAt(generatedAt, retentionDays);

  const analysisId = await createUsernameAnalysis({
    userId,
    subjectUsername: username,
    subjectName,
    settingsJson: {
      maxQueries: settings.maxQueries,
      countries: settings.countries,
      language: settings.language,
      resultLimit: settings.resultLimit,
      confidenceMin: settings.confidenceMin,
      retentionDays,
      expiresAt,
    },
  });

  const analysisRef = `username:${analysisId}`;
  const startedAt = generatedAt;
  let serpSuccessCount = 0;

  try {
    const batches = await mapPool(queries, 3, async (plan) => {
      try {
        const { getCachedSearchResults, setCachedSearchResults } =
          await import("@/lib/analysis/osint/search-cache");
        const cached = getCachedSearchResults(plan.query, "google");
        if (cached) {
          return {
            plan,
            items: cached,
            ok: true as const,
            fromCache: true as const,
          };
        }
        const items = await fetchGoogleSearch(plan.query, {
          recordFinance: false,
          userId,
          referenceKey: `${analysisRef}:${plan.id}`,
          engine: "google",
        });
        setCachedSearchResults(plan.query, items, "google");
        return {
          plan,
          items,
          ok: true as const,
          fromCache: false as const,
        };
      } catch (error) {
        console.error("[username-intelligence] query failed", plan.id, error);
        return {
          plan,
          items: [] as Awaited<ReturnType<typeof fetchGoogleSearch>>,
          ok: false as const,
          fromCache: false as const,
        };
      }
    });

    serpSuccessCount = batches.filter((b) => b.ok && !b.fromCache).length;

    if (serpSuccessCount > 0) {
      await recordApiUsageEvent({
        providerCode: "serpapi",
        eventType: "username_intelligence",
        referenceKey: analysisRef,
        userId,
        analysisId,
        requestCount: serpSuccessCount,
        success: true,
        detail: `Username Intelligence · ${username} · ${serpSuccessCount} SerpAPI-Calls / ${queries.length} Queries`,
        metaJson: {
          subjectUsername: username,
          analysisId,
          billableCount: serpSuccessCount,
          plannedCount: queries.length,
          countries: settings.countries,
          language: settings.language,
          queries: queries.map((q) => ({
            id: q.id,
            label: q.label,
            query: q.query,
          })),
        },
      });
    }

    const rawHits: UsernameHit[] = [];
    const seen = new Set<string>();
    let seq = 0;

    for (const batch of batches) {
      for (const item of batch.items) {
        if (!item.link || !item.title) continue;
        const key = dedupeKey(item.link, item.title);
        if (seen.has(key)) continue;
        seen.add(key);

        const platform = detectPlatform(item.link, item.title, item.snippet);
        const problemTags = detectProblemTags(
          item.link,
          item.title,
          item.snippet || ""
        );
        const queriedUsername = batch.plan.username || username;
        const evaluation = evaluateUsernameHit({
          username: queriedUsername,
          title: item.title,
          snippet: item.snippet || "",
          url: item.link,
          identity,
        });
        if (evaluation.isNoise || evaluation.score === 0) continue;
        // Keep weak matches for collapsed section (score >= 40)
        if (evaluation.score < 40) continue;
        const confidence = evaluation.score;
        const isWeakMatch = confidence < settings.confidenceMin;

        const band = confidenceBand(confidence);
        const riskLevel = riskFromHit(
          confidence,
          problemTags,
          platform.category
        );
        const visibleInfo = [item.title, item.snippet, item.displayLink].filter(
          (v): v is string => Boolean(v && String(v).trim())
        );

        rawHits.push({
          id: `uh-${++seq}`,
          platform: platform.platform,
          category: platform.category,
          profileName: profileNameFrom(queriedUsername, item.title, item.link),
          profileUrl: item.link,
          title: item.title,
          snippet: item.snippet || "—",
          visibleInfo: visibleInfo.slice(0, 6),
          identityScore: confidence,
          confidence,
          confidenceBand: band,
          riskLevel,
          firstSeen: extractYear(`${item.title} ${item.snippet || ""}`),
          queryUsed: batch.plan.query,
          queriedUsername,
          logoKey: platform.logoKey,
          isProblematic: problemTags.length > 0,
          problemTags,
          matchChecks: evaluation.checks,
          isWeakMatch,
        });
      }
    }

    // Deduped by URL already; risk-sort and apply result limit
    const hits = sortHitsByRisk(rawHits).slice(0, settings.resultLimit);

    const identityScore = computeIdentityScore(hits);
    const riskScore = computeRiskScore(hits);
    const confidence =
      hits.length === 0
        ? 0
        : Math.round(
            hits.reduce((sum, h) => sum + h.confidence, 0) / hits.length
          );

    const managementOverview = buildManagementOverview({
      username,
      hits,
      identityScore,
      riskScore,
      confidence,
    });
    const platformOverview = buildPlatformOverview(hits);
    const identityGraph = buildIdentityGraph(username, hits);
    const timeline = buildTimeline(hits);
    const heatmap = buildHeatmap(hits);
    const actions = buildActionPlan(hits, managementOverview);
    const securityOverview = buildSecurityOverview({
      hits,
      actions,
      overallRisk: managementOverview.overallRisk,
    });
    const identityFindings = buildIdentityFindings(hits);
    const { primary: primaryHits } = splitPrimaryAndWeakHits(hits);

    const geminiPayload = buildUsernameGeminiPayload({
      subjectName,
      subjectUsername: username,
      identityScore,
      riskScore,
      hits: primaryHits.length > 0 ? primaryHits : hits,
      managementOverview,
    });

    const gemini = await summarizeUsernameWithGemini({
      payload: geminiPayload,
      userId,
      analysisId,
    });

    if (gemini.summary) {
      await persistUsernameAiReport({
        analysisId,
        content: gemini.summary,
        model: gemini.model,
        promptHash: gemini.promptHash,
        tokenUsage: gemini.tokenUsage,
      });
    }

    const completedAt = new Date().toISOString();
    const summary =
      managementOverview.headline +
      (hits.length > 0
        ? ` Höchste Confidence: ${hits[0].confidence}% (${confidenceLabel(hits[0].confidence)}).`
        : "");

    const report: UsernameReport = {
      analysisId,
      moduleKey: "username_intelligence",
      subjectName,
      subjectUsername: username,
      scannedUsernames,
      status: "completed",
      identityScore,
      riskScore,
      confidence,
      summary,
      hitCount: hits.length,
      queryCount: queries.length,
      startedAt,
      completedAt,
      retentionDays,
      expiresAt,
      hits,
      managementOverview,
      securityOverview,
      identityFindings,
      platformOverview,
      identityGraph,
      timeline,
      heatmap,
      actions,
      aiSummary: gemini.summary,
      queries: queries.map((q) => q.query),
      apiConfigured: true,
      providerLabel: "SerpAPI + Gemini",
    };

    await persistUsernameReport(report);

    const finance = computeUsernameFinance(settings);
    const serpapiCost =
      Math.round(serpSuccessCount * settings.serpapiCostEur * 1_000_000) /
      1_000_000;
    const geminiTokens = gemini.tokenUsage?.totalTokenCount ?? 0;
    const geminiCost = gemini.summary ? settings.geminiCostEur : 0;
    const totalApi =
      Math.round((serpapiCost + geminiCost) * 1_000_000) / 1_000_000;
    const revenue = finance.revenuePerAnalysisEur;
    const profit = Math.round((revenue - totalApi) * 1_000_000) / 1_000_000;

    await persistUsernameCostLog({
      analysisId,
      userId,
      serpapiRequests: serpSuccessCount,
      serpapiCostEur: serpapiCost,
      geminiTokens,
      geminiCostEur: geminiCost,
      synCredits: settings.synCredits,
      totalApiCostEur: totalApi,
      estimatedProfitEur: profit,
      metaJson: {
        plannedQueries: queries.length,
        cacheHits: batches.filter((b) => b.fromCache).length,
        failedQueries: batches.filter((b) => !b.ok).length,
        hitCount: hits.length,
      },
    });

    return report;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Username Intelligence fehlgeschlagen";
    await failUsernameAnalysis(analysisId, message);
    throw error;
  }
}
