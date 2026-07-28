export interface ReverseImageModuleSettings {
  /** Legacy toggle kept for backward compatibility. */
  isActive: boolean;
  publicScanActive: boolean;
  faceVerificationActive: boolean;
  apiEnabled: boolean;
  maxPagesPerQuery: number;
  maxImagesPerQuery: number;
  identityScoreThreshold: number;
  domainRelevanceMin: number;
  aiRelevanceFilter: boolean;
  minConfidence: number;
  /** InsightFace compare endpoint */
  compareUrl: string;
  /** Match threshold 0.35–0.95 */
  similarityThreshold: number;
  compareTimeoutMs: number;
}

export const DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS: ReverseImageModuleSettings =
  {
    isActive: true,
    publicScanActive: true,
    faceVerificationActive: true,
    apiEnabled: true,
    maxPagesPerQuery: 2,
    maxImagesPerQuery: 100,
    identityScoreThreshold: 45,
    domainRelevanceMin: 35,
    aiRelevanceFilter: true,
    minConfidence: 55,
    compareUrl:
      process.env.INSIGHTFACE_COMPARE_URL?.trim() ||
      process.env.REVERSE_IMAGE_COMPARE_URL?.trim() ||
      "http://161.97.85.22:8000/compare",
    similarityThreshold: Number.parseFloat(
      process.env.REVERSE_IMAGE_SIMILARITY_THRESHOLD ?? "0.35"
    ),
    compareTimeoutMs: 12_000,
  };
