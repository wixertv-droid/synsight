import type { RiskLevel } from "@/types/platform";

/** Shared module keys — aligned with admin pricing / AnalysisKey. */
export type AnalysisModuleKey = "google_search" | string;

export type IntelligenceHitRisk = "none" | "watch" | "review" | "action";
export type IntelligenceRelevance = "relevant" | "neutral" | "low" | "stale";

export type IntelligenceHitSource = "google_custom_search" | "identity_profile";

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
  profileCompleteness: number;
  dataSourceLabel: string;
  apiConfigured: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  summaryText: string;
  aiSummary: string | null;
  managementOverview: IntelligenceCategoryStats;
  buckets: IntelligenceSummaryBuckets;
  queries: IntelligenceQueryPlan[];
  hits: IntelligenceHit[];
  recommendations: IntelligenceRecommendation[];
  executive: IntelligenceExecutiveSummary;
  missingProfileHints: string[];
}
