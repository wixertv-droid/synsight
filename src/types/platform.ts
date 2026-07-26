export type RiskLevel = "low" | "medium" | "high";
export type SystemState = "online" | "scanning" | "attention";

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: "cyan" | "amber" | "green" | "red";
  /** Optional help text rendered via InfoTooltip on dashboard cards. */
  info?: string;
}

export interface RiskSignal {
  id: string;
  level: RiskLevel;
  title: string;
  description: string;
  source: string;
  info?: string;
}

export interface AnalysisSource {
  label: string;
  /** 0–100 risk/intensity — higher pushes the radar point toward red. */
  value: number;
  status: "ready" | "scanning";
  /** Absolute signal/hit count when known. */
  count?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "Jetzt" | "Diese Woche" | "Empfohlen";
  completed: boolean;
}
