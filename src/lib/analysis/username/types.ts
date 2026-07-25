/**
 * Username Intelligence Scan — domain types.
 * Facts from SerpAPI only; Gemini receives verified hits exclusively.
 */

export type UsernameRiskLevel = "low" | "medium" | "high";

export type UsernameScanStatus =
  "pending" | "running" | "completed" | "failed" | "unavailable";

export type UsernameActionPriority = "SOFORT" | "HOCH" | "MITTEL" | "OPTIONAL";

export type UsernameConfidenceBand =
  "confirmed" | "likely" | "possible" | "hidden";

export interface UsernameModuleSettings {
  isActive: boolean;
  apiEnabled: boolean;
  maxQueries: number;
  countries: string;
  language: string;
  resultLimit: number;
  confidenceMin: number;
  synCredits: number;
  serpapiCostEur: number;
  geminiCostEur: number;
  markupPercent: number;
  minProfitEur: number;
  creditValueEur: number;
}

export interface UsernameFinanceSnapshot {
  synCredits: number;
  serpapiCostEur: number;
  geminiCostEur: number;
  markupPercent: number;
  minProfitEur: number;
  creditValueEur: number;
  maxQueries: number;
  estimatedApiCostEur: number;
  costPerAnalysisEur: number;
  revenuePerAnalysisEur: number;
  profitPerAnalysisEur: number;
  meetsMinProfit: boolean;
}

export interface UsernameHit {
  id: string;
  platform: string;
  category: string;
  profileName: string | null;
  profileUrl: string | null;
  title: string;
  snippet: string;
  visibleInfo: string[];
  identityScore: number;
  confidence: number;
  confidenceBand: UsernameConfidenceBand;
  riskLevel: UsernameRiskLevel;
  firstSeen: string | null;
  queryUsed: string;
  logoKey: string;
  isProblematic: boolean;
  problemTags: string[];
}

export interface UsernamePlatformOverviewItem {
  platform: string;
  category: string;
  count: number;
  avgConfidence: number;
  maxRisk: UsernameRiskLevel;
}

export interface UsernameIdentityGraphNode {
  id: string;
  label: string;
  kind: "username" | "platform" | "signal";
  weight: number;
}

export interface UsernameIdentityGraphEdge {
  from: string;
  to: string;
  label: string;
}

export interface UsernameTimelineItem {
  label: string;
  detail: string;
  sortKey: string;
}

export interface UsernameHeatmapCell {
  category: string;
  intensity: number;
  count: number;
}

export interface UsernameManagementOverview {
  headline: string;
  overallRisk: UsernameRiskLevel;
  overallRiskLabel: string;
  identityScore: number;
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  platformCount: number;
  hitCount: number;
  uniqueUsername: boolean;
  problematicCount: number;
  topCategories: string[];
}

export interface UsernameActionItem {
  priority: UsernameActionPriority;
  title: string;
  why: string;
  riskReduced: string;
  how: string;
  effort: string;
  difficulty: string;
  benefit: string;
  relatedPlatform: string | null;
}

export interface UsernameReport {
  analysisId: number;
  moduleKey: "username_intelligence";
  subjectName: string;
  subjectUsername: string;
  status: UsernameScanStatus;
  identityScore: number;
  riskScore: number;
  confidence: number;
  summary: string;
  hitCount: number;
  queryCount: number;
  startedAt: string | null;
  completedAt: string | null;
  retentionDays?: number;
  expiresAt?: string | null;
  hits: UsernameHit[];
  managementOverview: UsernameManagementOverview;
  platformOverview: UsernamePlatformOverviewItem[];
  identityGraph: {
    nodes: UsernameIdentityGraphNode[];
    edges: UsernameIdentityGraphEdge[];
  };
  timeline: UsernameTimelineItem[];
  heatmap: UsernameHeatmapCell[];
  actions: UsernameActionItem[];
  aiSummary: string | null;
  queries: string[];
  apiConfigured: boolean;
  providerLabel: string;
}

export interface UsernameGeminiPayload {
  mode: "facts_only";
  instructions: string;
  subjectName: string;
  subjectUsername: string;
  identityScore: number;
  riskScore: number;
  hits: Array<{
    platform: string;
    category: string;
    profileName: string | null;
    profileUrl: string | null;
    title: string;
    snippet: string;
    visibleInfo: string[];
    confidence: number;
    riskLevel: UsernameRiskLevel;
    isProblematic: boolean;
    problemTags: string[];
  }>;
  managementOverview: UsernameManagementOverview;
  constraints: string[];
}

export const DEFAULT_USERNAME_MODULE_SETTINGS: UsernameModuleSettings = {
  isActive: true,
  apiEnabled: true,
  maxQueries: 8,
  countries: "de",
  language: "de",
  resultLimit: 40,
  confidenceMin: 60,
  synCredits: 10,
  serpapiCostEur: 0.023,
  geminiCostEur: 0.002,
  markupPercent: 100,
  minProfitEur: 0.05,
  creditValueEur: 0.01,
};
