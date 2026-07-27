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
  /** 0–1 cosine similarity from InsightFace */
  similarity: number;
  /** Best-matching reference slot from identity profile */
  referenceImageType: string | null;
  riskLevel: ReverseImageRiskLevel;
  /** Relative path under storage/private/reverse-image/users/{userId}/ */
  storedPath: string | null;
  thumbnailPath: string | null;
  sourceHost: string | null;
  fetchedAt: string;
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
}

export interface ReverseImageReport {
  scanId: number;
  moduleKey: "reverse_image_search";
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
