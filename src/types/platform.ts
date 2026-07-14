export type RiskLevel = "low" | "medium" | "high";
export type SystemState = "online" | "scanning" | "attention";

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: "cyan" | "amber" | "green" | "red";
}

export interface RiskSignal {
  id: string;
  level: RiskLevel;
  title: string;
  description: string;
  source: string;
}

export interface AnalysisSource {
  label: string;
  value: number;
  status: "ready" | "scanning";
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "Jetzt" | "Diese Woche" | "Empfohlen";
  completed: boolean;
}

