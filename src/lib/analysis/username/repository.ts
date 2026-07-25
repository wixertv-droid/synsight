import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  usernameAiReports,
  usernameAnalysis,
  usernameCostLogs,
  usernameHits,
  usernameReports,
} from "@/lib/database/schema";
import type {
  UsernameHit,
  UsernameReport,
} from "@/lib/analysis/username/types";
import { ensureUsernameSchema } from "@/lib/analysis/username/ensure-schema";
import { isReportExpired, toMysqlTimestamp } from "@/lib/analysis/retention";

function mysqlNow(): string {
  return toMysqlTimestamp(new Date());
}

export function readMysqlInsertId(result: unknown): number {
  if (!result) return 0;
  if (Array.isArray(result)) {
    const header = result[0] as { insertId?: number | bigint } | undefined;
    return Number(header?.insertId ?? 0);
  }
  if (typeof result === "object" && result !== null && "insertId" in result) {
    return Number((result as { insertId?: number | bigint }).insertId ?? 0);
  }
  return 0;
}

export async function createUsernameAnalysis(input: {
  userId: number;
  subjectUsername: string;
  subjectName: string;
  settingsJson?: unknown;
}): Promise<number> {
  await ensureUsernameSchema();
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const result = await db.insert(usernameAnalysis).values({
    userId: input.userId,
    status: "running",
    subjectUsername: input.subjectUsername,
    subjectName: input.subjectName,
    startedAt: mysqlNow(),
    settingsJson: input.settingsJson ?? null,
  });

  return readMysqlInsertId(result);
}

export async function failUsernameAnalysis(
  analysisId: number,
  summary: string
): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  await db
    .update(usernameAnalysis)
    .set({
      status: "failed",
      summary,
      completedAt: mysqlNow(),
    })
    .where(eq(usernameAnalysis.id, analysisId));
}

export async function persistUsernameReport(
  report: UsernameReport
): Promise<void> {
  await ensureUsernameSchema();
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const completedAtMysql = mysqlNow();

  await db
    .update(usernameAnalysis)
    .set({
      status: report.status,
      identityScore: report.identityScore,
      riskScore: report.riskScore,
      confidence: report.confidence,
      hitCount: report.hitCount,
      queryCount: report.queryCount,
      summary: report.summary,
      // MySQL TIMESTAMP — never write ISO `T`/`Z` strings
      completedAt: completedAtMysql,
    })
    .where(eq(usernameAnalysis.id, report.analysisId));

  if (report.hits.length > 0) {
    await db.insert(usernameHits).values(
      report.hits.map((hit) => ({
        analysisId: report.analysisId,
        platform: hit.platform,
        category: hit.category,
        profileName: hit.profileName,
        profileUrl: hit.profileUrl,
        title: hit.title,
        snippet: hit.snippet,
        visibleInfoJson: hit.visibleInfo,
        identityScore: hit.identityScore,
        confidence: hit.confidence,
        riskLevel: hit.riskLevel,
        firstSeen: hit.firstSeen,
        queryUsed: hit.queryUsed,
        logoKey: hit.logoKey,
        metaJson: {
          confidenceBand: hit.confidenceBand,
          isProblematic: hit.isProblematic,
          problemTags: hit.problemTags,
        },
      }))
    );
  }

  await db.insert(usernameReports).values({
    analysisId: report.analysisId,
    reportJson: report,
    managementSummary: report.managementOverview.headline,
    identityGraphJson: report.identityGraph,
    platformOverviewJson: report.platformOverview,
    timelineJson: report.timeline,
    heatmapJson: report.heatmap,
  });
}

export async function persistUsernameAiReport(input: {
  analysisId: number;
  content: string;
  model: string | null;
  promptHash: string | null;
  tokenUsage: unknown;
}): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  await db.insert(usernameAiReports).values({
    analysisId: input.analysisId,
    model: input.model,
    promptHash: input.promptHash,
    content: input.content,
    tokenUsageJson: input.tokenUsage ?? null,
  });
}

export async function persistUsernameCostLog(input: {
  analysisId: number;
  userId: number | null;
  serpapiRequests: number;
  serpapiCostEur: number;
  geminiTokens: number;
  geminiCostEur: number;
  synCredits: number;
  totalApiCostEur: number;
  estimatedProfitEur: number;
  metaJson?: unknown;
}): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  await db.insert(usernameCostLogs).values({
    analysisId: input.analysisId,
    userId: input.userId,
    serpapiRequests: input.serpapiRequests,
    serpapiCostEur: String(input.serpapiCostEur),
    geminiTokens: input.geminiTokens,
    geminiCostEur: String(input.geminiCostEur),
    synCredits: input.synCredits,
    totalApiCostEur: String(input.totalApiCostEur),
    estimatedProfitEur: String(input.estimatedProfitEur),
    metaJson: input.metaJson ?? null,
  });
}

function mapHitRow(row: typeof usernameHits.$inferSelect): UsernameHit {
  const meta =
    row.metaJson &&
    typeof row.metaJson === "object" &&
    !Array.isArray(row.metaJson)
      ? (row.metaJson as {
          confidenceBand?: UsernameHit["confidenceBand"];
          isProblematic?: boolean;
          problemTags?: string[];
        })
      : {};
  const visible = Array.isArray(row.visibleInfoJson)
    ? row.visibleInfoJson.filter((v): v is string => typeof v === "string")
    : [];

  const confidence = row.confidence;
  return {
    id: `hit-${row.id}`,
    platform: row.platform,
    category: row.category,
    profileName: row.profileName,
    profileUrl: row.profileUrl,
    title: row.title ?? "",
    snippet: row.snippet ?? "",
    visibleInfo: visible,
    identityScore: row.identityScore,
    confidence,
    confidenceBand:
      meta.confidenceBand ??
      (confidence >= 95
        ? "confirmed"
        : confidence >= 80
          ? "likely"
          : confidence >= 60
            ? "possible"
            : "hidden"),
    riskLevel: (row.riskLevel as UsernameHit["riskLevel"]) || "low",
    firstSeen: row.firstSeen,
    queryUsed: row.queryUsed ?? "",
    logoKey: row.logoKey ?? "other",
    isProblematic: Boolean(meta.isProblematic),
    problemTags: Array.isArray(meta.problemTags) ? meta.problemTags : [],
  };
}

export async function getLatestUsernameReport(
  userId: number
): Promise<UsernameReport | null> {
  await ensureUsernameSchema();
  const db = getDatabase();
  if (!db) return null;

  const analyses = await db
    .select()
    .from(usernameAnalysis)
    .where(eq(usernameAnalysis.userId, userId))
    .orderBy(desc(usernameAnalysis.createdAt))
    .limit(1);

  const analysis = analyses[0];
  if (!analysis || analysis.status !== "completed") return null;

  const reportRows = await db
    .select()
    .from(usernameReports)
    .where(eq(usernameReports.analysisId, analysis.id))
    .limit(1);

  const stored = reportRows[0]?.reportJson;
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const report = stored as UsernameReport;
    if (
      isReportExpired({
        expiresAt: report.expiresAt,
        generatedAt: report.completedAt ?? analysis.completedAt ?? undefined,
        retentionDays: report.retentionDays,
      })
    ) {
      return null;
    }
    return report;
  }

  const hitRows = await db
    .select()
    .from(usernameHits)
    .where(eq(usernameHits.analysisId, analysis.id));

  const aiRows = await db
    .select()
    .from(usernameAiReports)
    .where(eq(usernameAiReports.analysisId, analysis.id))
    .orderBy(desc(usernameAiReports.createdAt))
    .limit(1);

  const hits = hitRows.map(mapHitRow);
  const overviewJson = reportRows[0]?.platformOverviewJson;
  const graphJson = reportRows[0]?.identityGraphJson;
  const timelineJson = reportRows[0]?.timelineJson;
  const heatmapJson = reportRows[0]?.heatmapJson;

  return {
    analysisId: analysis.id,
    moduleKey: "username_intelligence",
    subjectName: analysis.subjectName ?? "Unbekannt",
    subjectUsername: analysis.subjectUsername ?? "",
    status: "completed",
    identityScore: analysis.identityScore,
    riskScore: analysis.riskScore,
    confidence: analysis.confidence,
    summary: analysis.summary ?? "",
    hitCount: analysis.hitCount,
    queryCount: analysis.queryCount,
    startedAt: analysis.startedAt,
    completedAt: analysis.completedAt,
    hits,
    managementOverview: {
      headline: reportRows[0]?.managementSummary ?? analysis.summary ?? "",
      overallRisk:
        analysis.riskScore >= 70
          ? "high"
          : analysis.riskScore >= 40
            ? "medium"
            : "low",
      overallRiskLabel:
        analysis.riskScore >= 70
          ? "HOCH"
          : analysis.riskScore >= 40
            ? "MITTEL"
            : "NIEDRIG",
      identityScore: analysis.identityScore,
      threatLevel:
        analysis.riskScore >= 70
          ? "HIGH"
          : analysis.riskScore >= 40
            ? "MEDIUM"
            : "LOW",
      confidence: analysis.confidence,
      platformCount: new Set(hits.map((h) => h.platform)).size,
      hitCount: hits.length,
      uniqueUsername: false,
      problematicCount: hits.filter((h) => h.isProblematic).length,
      topCategories: [],
    },
    platformOverview: Array.isArray(overviewJson)
      ? (overviewJson as UsernameReport["platformOverview"])
      : [],
    identityGraph:
      graphJson && typeof graphJson === "object"
        ? (graphJson as UsernameReport["identityGraph"])
        : { nodes: [], edges: [] },
    timeline: Array.isArray(timelineJson)
      ? (timelineJson as UsernameReport["timeline"])
      : [],
    heatmap: Array.isArray(heatmapJson)
      ? (heatmapJson as UsernameReport["heatmap"])
      : [],
    actions: [],
    aiSummary: aiRows[0]?.content ?? null,
    queries: [],
    apiConfigured: true,
    providerLabel: "SerpAPI + Gemini",
  };
}
