/**
 * Digital Leak & Exposure Scan — domain types.
 * Metadata only: never store passwords or raw secrets.
 */

export type DigitalExposureResultType =
  "EMAIL" | "PHONE" | "PASSWORD_EXPOSURE" | "BREACH" | "SOURCE";

export type DigitalExposureRiskLevel = "low" | "medium" | "high";

export type DigitalExposureScanStatus =
  "pending" | "running" | "completed" | "failed" | "unavailable";

export type DigitalExposureActionPriority =
  "SOFORT" | "HOCH" | "MITTEL" | "OPTIONAL";

/** Single exposed attribute from DeHashed — values masked or presence-only. */
export interface DigitalExposureAttribute {
  key: string;
  label: string;
  present: boolean;
  /** Masked sample when safe (never passwords/hashes) */
  maskedValue?: string | null;
}

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
  /** Sprint 6D — full attribute matrix when available */
  attributes?: DigitalExposureAttribute[];
  recordCount?: number;
  confidence?: number;
  hashType?: string | null;
  collection?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  obtainedFrom?: string | null;
}

export interface DigitalExposureManagementOverview {
  headline: string;
  overallRisk: DigitalExposureRiskLevel;
  overallRiskLabel: string;
  identityExposure: number;
  threatLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  confirmedSources: number;
  exposedAttributeCount: number;
  exposedCategories: string[];
  hasPasswordHints: boolean;
  hasPublicEmail: boolean;
  hasPublicPhone: boolean;
}

export interface DigitalExposureActionItem {
  priority: DigitalExposureActionPriority;
  title: string;
  why: string;
  riskReduced: string;
  how: string;
  effort: string;
  difficulty: string;
  benefit: string;
  relatedSource: string | null;
}

export interface DigitalExposureThreatMatrix {
  credentialStuffing: number;
  phishing: number;
  spam: number;
  socialEngineering: number;
  identityTheft: number;
  accountTakeover: number;
  simSwapping: number;
  overall: number;
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
  /** Facts-only payload for Gemini cybersecurity summary */
  geminiPrep: DigitalExposureGeminiPayload;
  /** Sprint 6D — Digital Forensics KI-Report (persisted via SOURCE finding) */
  aiSummary?: string | null;
  managementOverview?: DigitalExposureManagementOverview;
  actions?: DigitalExposureActionItem[];
  threatMatrix?: DigitalExposureThreatMatrix;
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
    attributes?: DigitalExposureAttribute[];
    recordCount?: number;
    confidence?: number;
    hashType?: string | null;
    collection?: string | null;
  }>;
  managementOverview?: DigitalExposureManagementOverview;
  threatMatrix?: DigitalExposureThreatMatrix;
  constraints: string[];
}

export const AI_SUMMARY_FINDING_TITLE = "__DIGITAL_FORENSICS_AI__";
