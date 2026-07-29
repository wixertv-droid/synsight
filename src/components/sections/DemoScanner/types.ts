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



  // optionale Felder für zukünftige Analysemodule

  exposure_count?: number;


  sources_found?: number;

}



export interface ApiResult {


  status:
    | "success"
    | "error";



  data?: ScanData;



  message?: string;



  // Darstellung im Demo Scanner

  riskLevel?: string;



  summary?: string;



  findings?: ScanFinding[];



  platforms?: string[];


}
