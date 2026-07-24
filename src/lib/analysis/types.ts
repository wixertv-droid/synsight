import type { RiskLevel } from "@/types/platform";

/** Shared module keys — aligned with admin pricing / AnalysisKey. */
export type AnalysisModuleKey = "google_search" | string;

export type IntelligenceHitRisk = "none" | "watch" | "review" | "action";
export type IntelligenceRelevance = "relevant" | "neutral" | "low" | "stale";

export type IntelligenceHitSource = "serpapi_google" | "identity_profile";

export interface IntelligenceScanStep {
  id: string;
  label: string;
  terminal: string;
  /** ms from scan start */
  atMs: number;
}

export interface IntelligenceQueryPlan {
  id: string;
  label: string;
  query: string;
  help: string;
}

export interface IntelligenceHit {
  id: string;
  query: string;
  title: string;
  url: string;
  snippet: string;
  category: string;
  /** ISO timestamp — analysis fetch time (API does not supply index date). */
  fetchedAt: string;
  source: string;
  sourceType: IntelligenceHitSource;
  visibility: "public_index" | "profile_linked";
  relevance: IntelligenceRelevance;
  risk: IntelligenceHitRisk;
  status: "verified" | "profile_only";
  whyFound: string;
  whyRelevant: string;
  visibleData: string;
  isPublic: boolean;
  isProblematic: boolean;
  risks: string;
  canIgnore: boolean;
  shouldAct: boolean;
  recommendation: string;
  /** UI enrichment — optional for legacy reports */
  displayCategory?: string;
  filterCategory?: string;
  severity?: "critical" | "high" | "medium" | "low";
  riskPercent?: number;
  identityConfidence?: number;
  identityConfidenceLabel?: string;
  /** Explainable confidence checklist (Sprint 6C) */
  confidenceChecks?: Array<{ label: string; found: boolean }>;
  firstSeenAt?: string;
  lastSeenAt?: string;
  pageCount?: number;
  aggregatedHost?: string;
  whyFoundPlain?: string;
  whyRelevantPlain?: string;
  belongsToYou?: string;
  isDangerous?: string;
  needsAction?: string;
  aiEvaluation?: {
    stars: number;
    headline: string;
    reasons: string[];
    dangers: string[];
    recommendation: string;
  };
}

export interface IntelligenceReportScorecard {
  overallScore: number;
  privacyScore: number;
  publicVisibility: number;
  identityRisk: number;
  likelyMeCount: number;
  criticalCount: number;
  highCount: number;
  totalLive: number;
}

export interface IntelligenceRecommendation {
  title: string;
  detail: string;
  why: string;
  danger: string;
  howToFix: string;
  effort: string;
  priority: "Jetzt" | "Diese Woche" | "Optional";
  difficulty: "Niedrig" | "Mittel" | "Hoch";
  relatedHitIds: string[];
}

export interface IntelligenceSummaryBuckets {
  total: number;
  relevant: number;
  neutral: number;
  low: number;
  stale: number;
}

export interface IntelligenceExecutiveSummary {
  totalPublicHits: number;
  criticalHits: number;
  recommendedActions: string[];
  overallRisk: RiskLevel;
  priority: "Jetzt" | "Diese Woche" | "Beobachten" | "Keine Maßnahme";
  narrative: string;
}

export interface IntelligenceModuleDefinition {
  key: AnalysisModuleKey;
  title: string;
  scanSteps: IntelligenceScanStep[];
  minScanMs: number;
  maxScanMs: number;
  estimatedDurationLabel?: string;
}

export interface IntelligenceCategoryStats {
  websites: number;
  social: number;
  images: number;
  phones: number;
  emails: number;
  companies: number;
  documents: number;
  press: number;
  forums: number;
  other: number;
  mentions: number;
}

export interface IntelligenceReport {
  moduleKey: AnalysisModuleKey;
  moduleTitle: string;
  subjectName: string;
  generatedAt: string;
  generatedAtLabel: string;
  /** Days to keep the report; 0 = unlimited. */
  retentionDays: number;
  /** ISO expiry; null when unlimited. */
  expiresAt: string | null;
  profileCompleteness: number;
  dataSourceLabel: string;
  apiConfigured: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  summaryText: string;
  aiSummary: string | null;
  /** Short structured summary for non-technical users */
  analysisSummary?: string | null;
  scorecard?: IntelligenceReportScorecard | null;
  managementOverview: IntelligenceCategoryStats;
  /** Sprint 6C multi-dimensional threat scores */
  threatMatrix?: {
    identityRisk: number;
    socialEngineeringRisk: number;
    privacyRisk: number;
    reputationRisk: number;
    leakRisk: number;
    fraudRisk: number;
    impersonationRisk: number;
    overall: number;
  } | null;
  fingerprintHash?: string | null;
  buckets: IntelligenceSummaryBuckets;
  queries: IntelligenceQueryPlan[];
  hits: IntelligenceHit[];
  recommendations: IntelligenceRecommendation[];
  executive: IntelligenceExecutiveSummary;
  missingProfileHints: string[];
}
