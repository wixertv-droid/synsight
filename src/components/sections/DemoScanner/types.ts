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
  summary?: string;
  risk_level?: string;
  message?: string;
  [key: string]: unknown;
}
