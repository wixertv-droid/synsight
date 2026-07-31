export type ScanPhase =
  | "idle"
  | "booting"
  | "scanning"
  | "analysis"
  | "fullscreen_result"
  | "complete"
  | "closing_crt";

export interface ScanFinding {
  category: string;
  title: string;
  description: string;
  platform?: string;
  detail?: string;
  risk: "low" | "medium" | "high" | string;
}

export interface ScanData {
  query: string;
  queryType: "email" | "username" | "name" | "unknown" | string;
  findings: ScanFinding[];
  platforms: string[];
  exposureScore: number;
  riskLevel: string;
  summary: string;
  timestamp: string;
  exposure_count?: number;
  sources_found?: number;
}

export interface ApiResult {
  status: "success" | "error";
  data?: ScanData;
  message?: string;
  riskLevel?: string;
  summary?: string;
  findings?: ScanFinding[];
  platforms?: string[];
}
