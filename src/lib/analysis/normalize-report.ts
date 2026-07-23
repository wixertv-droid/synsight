import type {
  IntelligenceCategoryStats,
  IntelligenceExecutiveSummary,
  IntelligenceReport,
  IntelligenceSummaryBuckets,
} from "@/lib/analysis/types";
import type { RiskLevel } from "@/types/platform";

const EMPTY_BUCKETS: IntelligenceSummaryBuckets = {
  total: 0,
  relevant: 0,
  neutral: 0,
  low: 0,
  stale: 0,
};

const EMPTY_OVERVIEW: IntelligenceCategoryStats = {
  websites: 0,
  social: 0,
  images: 0,
  phones: 0,
  emails: 0,
  companies: 0,
  documents: 0,
  press: 0,
  forums: 0,
  other: 0,
  mentions: 0,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRiskLevel(value: unknown): RiskLevel {
  if (value === "low" || value === "medium" || value === "high") return value;
  if (value === "niedrig") return "low";
  if (value === "mittel") return "medium";
  if (value === "hoch") return "high";
  return "low";
}

function normalizeBuckets(value: unknown): IntelligenceSummaryBuckets {
  const row = asRecord(value);
  if (!row) return { ...EMPTY_BUCKETS };
  return {
    total: Number(row.total) || 0,
    relevant: Number(row.relevant) || 0,
    neutral: Number(row.neutral) || 0,
    low: Number(row.low) || 0,
    stale: Number(row.stale) || 0,
  };
}

function normalizeOverview(value: unknown): IntelligenceCategoryStats {
  const row = asRecord(value);
  if (!row) return { ...EMPTY_OVERVIEW };
  return {
    websites: Number(row.websites) || 0,
    social: Number(row.social) || 0,
    images: Number(row.images) || 0,
    phones: Number(row.phones) || 0,
    emails: Number(row.emails) || 0,
    companies: Number(row.companies) || 0,
    documents: Number(row.documents) || 0,
    press: Number(row.press) || 0,
    forums: Number(row.forums) || 0,
    other: Number(row.other) || 0,
    mentions: Number(row.mentions) || 0,
  };
}

function normalizeExecutive(
  value: unknown,
  riskLevel: RiskLevel
): IntelligenceExecutiveSummary {
  const row = asRecord(value);
  return {
    totalPublicHits: Number(row?.totalPublicHits) || 0,
    criticalHits: Number(row?.criticalHits) || 0,
    recommendedActions: asArray<string>(row?.recommendedActions).filter(
      (item) => typeof item === "string"
    ),
    overallRisk: asRiskLevel(row?.overallRisk ?? riskLevel),
    priority:
      row?.priority === "Jetzt" ||
      row?.priority === "Diese Woche" ||
      row?.priority === "Beobachten" ||
      row?.priority === "Keine Maßnahme"
        ? row.priority
        : "Keine Maßnahme",
    narrative:
      typeof row?.narrative === "string"
        ? row.narrative
        : "Keine Executive Summary verfügbar.",
  };
}

/**
 * Ensures a persisted or API report always has the arrays/objects the UI expects.
 * Prevents SYSTEMFEHLER when report_json is partial, stringified, or legacy-shaped.
 */
export function normalizeIntelligenceReport(
  raw: unknown
): IntelligenceReport | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  const row = asRecord(value);
  if (!row) return null;

  // Legacy / mistaken nesting: { report: { ... } }
  const nested = asRecord(row.report);
  const source = nested ?? row;

  const riskLevel = asRiskLevel(source.riskLevel);
  const hits = asArray<IntelligenceReport["hits"][number]>(source.hits);
  const queries = asArray<IntelligenceReport["queries"][number]>(
    source.queries
  );
  const recommendations = asArray<
    IntelligenceReport["recommendations"][number]
  >(source.recommendations);

  return {
    moduleKey:
      typeof source.moduleKey === "string" ? source.moduleKey : "google_search",
    moduleTitle:
      typeof source.moduleTitle === "string"
        ? source.moduleTitle
        : "Google Intelligence Report",
    subjectName:
      typeof source.subjectName === "string" && source.subjectName.trim()
        ? source.subjectName
        : "Unbekannt",
    generatedAt:
      typeof source.generatedAt === "string"
        ? source.generatedAt
        : new Date().toISOString(),
    generatedAtLabel:
      typeof source.generatedAtLabel === "string"
        ? source.generatedAtLabel
        : "—",
    retentionDays:
      typeof source.retentionDays === "number" && source.retentionDays >= 0
        ? source.retentionDays
        : 30,
    expiresAt:
      typeof source.expiresAt === "string"
        ? source.expiresAt
        : source.expiresAt === null
          ? null
          : null,
    profileCompleteness: Number(source.profileCompleteness) || 0,
    dataSourceLabel:
      typeof source.dataSourceLabel === "string"
        ? source.dataSourceLabel
        : "Unbekannt",
    apiConfigured: Boolean(source.apiConfigured),
    riskScore: Math.max(0, Math.min(100, Number(source.riskScore) || 0)),
    riskLevel,
    summaryText:
      typeof source.summaryText === "string"
        ? source.summaryText
        : "Kein Report-Text verfügbar.",
    aiSummary: typeof source.aiSummary === "string" ? source.aiSummary : null,
    managementOverview: normalizeOverview(source.managementOverview),
    buckets: normalizeBuckets(source.buckets),
    queries,
    hits,
    recommendations,
    executive: normalizeExecutive(source.executive, riskLevel),
    missingProfileHints: asArray<string>(source.missingProfileHints).filter(
      (item) => typeof item === "string"
    ),
  };
}
