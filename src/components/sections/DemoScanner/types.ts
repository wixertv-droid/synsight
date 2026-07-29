export type ScanPhase =
  | "idle"
  | "booting"
  | "scanning"
  | "analysis"
  | "complete"
  | "closing_crt";


export interface ScanData {
  query: string;

  queryType:
    | "email"
    | "username"
    | "name"
    | "unknown";

  findings: {
    category: string;
    title: string;
    description: string;
    risk:
      | "low"
      | "medium"
      | "high";
  }[];

  platforms: string[];

  exposureScore: number;

  riskLevel:
    | "Niedrig"
    | "Erhöht"
    | "Hoch"
    | "Kritisch";


  summary: string;

  timestamp: string;
}


export interface ApiResult {

  status:
    | "success"
    | "error";

  data?: ScanData;

  message?: string;

}
