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
  error?: string;

  [key: string]: unknown;
}


export interface ScannerOverlayProps {
  phase: ScanPhase;
  target: string;
  apiResult: ApiResult | null;
  rawData: ScanData | null;
  onClose: () => void;
}
