/**
 * Digital Leak & Exposure Scan — domain types.
 * Metadata only: never store passwords or raw secrets.
 */

export type DigitalExposureResultType =
  "EMAIL" | "PHONE" | "PASSWORD_EXPOSURE" | "BREACH" | "SOURCE";

export type DigitalExposureRiskLevel = "low" | "medium" | "high";

export type DigitalExposureScanStatus =
  "pending" | "running" | "completed" | "failed" | "unavailable";

export interface DigitalExposureFinding {
  type: DigitalExposureResultType;
  title: string;
  description: string;
  riskLevel: DigitalExposureRiskLevel;
  sourceName: string | null;
  sourceDate: string | null;
  recommendation: string | null;
  sourceUrl: string | null;
  identifierMasked: string | null;
  /** Public data-class labels from breach metadata — never password values */
  dataClasses: string[];
}

export interface DigitalExposureReport {
  scanId: number;
  moduleKey: "digital_leak_exposure";
  subjectName: string;
  status: DigitalExposureScanStatus;
  riskScore: number;
  summary: string;
  emailCount: number;
  phoneCount: number;
  findingCount: number;
  startedAt: string | null;
  completedAt: string | null;
  findings: DigitalExposureFinding[];
  /** Facts-only payload for a future Gemini cybersecurity summary */
  geminiPrep: DigitalExposureGeminiPayload;
  apiConfigured: boolean;
  providerLabel: string;
}

export interface DigitalExposureGeminiPayload {
  mode: "facts_only";
  instructions: string;
  subjectName: string;
  riskScore: number;
  findings: Array<{
    type: DigitalExposureResultType;
    title: string;
    riskLevel: DigitalExposureRiskLevel;
    sourceName: string | null;
    sourceDate: string | null;
    recommendation: string | null;
    dataClasses: string[];
  }>;
  constraints: string[];
}
