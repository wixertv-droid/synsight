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

  risk:
    | "low"
    | "medium"
    | "high";

}


export interface ScanData {

  query: string;

  queryType:
    | "email"
    | "username"
    | "name"
    | "unknown";


  findings: ScanFinding[];


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



  // Übergangs-Kompatibilität
  // für DemoScanner UI

  riskLevel?: string;


  summary?: string;


  findings?: ScanFinding[];


  platforms?: string[];


}
