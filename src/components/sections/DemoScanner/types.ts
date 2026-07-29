export type ScanPhase =
  | "idle"
  | "scanning"
  | "fullscreen_result"
  | "closing_crt"
  | "complete";


export interface ApiResult {
  summary: string;
  riskLevel: string;
}


export interface ScanData {
  status?: string;
  risk_level?: string;
  summary?: string;

  findings?: {
    category: string;
    title: string;
    value: string;
    severity: "low" | "medium" | "high";
  }[];

  exposure_count?: number;
  sources_found?: number;
  identity_matches?: number;

  [key: string]: unknown;
}
