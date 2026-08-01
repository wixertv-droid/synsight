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
  confidence?: number;
  source?: string;
  url?: string;
}

export interface ScanModule {
  id: string;
  label: string;
  status: "ok" | "empty" | "error" | "started";
  findings: ScanFinding[];
  count: number;
  summary: string;
}

export interface ScanQueries {
  email?: string;
  username?: string;
  phone?: string;
  domain?: string;
  url?: string;
  name?: string;
}

export interface ScanData {
  query: string;
  queries: ScanQueries;
  queryType: string;
  findings: ScanFinding[];
  modules: ScanModule[];
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
  modules?: ScanModule[];
  platforms?: string[];
}
