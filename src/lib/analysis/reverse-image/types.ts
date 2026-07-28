/**
 * Reverse Image Search — domain types.
 * Candidates from SerpAPI Google Images; matches verified via InsightFace similarity.
 */

export type ReverseImageRiskLevel = "low" | "medium" | "high";

export type ReverseImageScanStatus =
  | "pending"
  | "discovering"
  | "discovery_complete"
  | "comparing"
  | "running"
  | "completed"
  | "failed"
  | "unavailable";

export interface ReverseImageHit {
  id: string;
  query: string;
  title: string;
  sourceUrl: string | null;
  imageUrl: string;
  /** 0–1 overall confidence / relevance for the discovery result. */
  similarity: number;
  /** Reserved for a later standalone Face Intelligence module. */
  referenceImageType: string | null;
  riskLevel: ReverseImageRiskLevel;
  /** Relative path under storage/private/reverse-image/users/{userId}/ */
  storedPath: string | null;
  thumbnailPath: string | null;
  sourceHost: string | null;
  fetchedAt: string;
  candidateScore?: number | null;
  imageKind?: string | null;
  riskBand?: string | null;
  scoreReasons?: string[];
  queryGroup?: "name" | "alias" | "username" | "social";
}

export interface ReverseImageManagementOverview {
  headline: string;
  overallRisk: ReverseImageRiskLevel;
  overallRiskLabel: string;
  matchCount: number;
  candidateCount: number;
  queryCount: number;
  referenceImageCount: number;
  avgSimilarity: number;
  maxSimilarity: number;
  highConfidenceCount: number;
  relevantImageCount: number;
  discardedImageCount: number;
  socialMediaCount: number;
  publicWebsiteCount: number;
  possiblePersonImageCount: number;
  confidenceScore: number;
}

export interface ReverseImageReport {
  scanId: number;
  moduleKey: "public_image_exposure_scan" | "face_identity_verification";
  status: ReverseImageScanStatus;
  subjectName: string;
  startedAt: string | null;
  completedAt: string | null;
  riskScore: number;
  summary: string | null;
  queryCount: number;
  candidateCount: number;
  matchCount: number;
  referenceImageCount: number;
  retentionDays: number;
  expiresAt: string | null;
  hits: ReverseImageHit[];
  managementOverview: ReverseImageManagementOverview;
}
