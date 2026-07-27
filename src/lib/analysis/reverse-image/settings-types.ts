export interface ReverseImageModuleSettings {
  isActive: boolean;
  apiEnabled: boolean;
  /** InsightFace compare endpoint */
  compareUrl: string;
  /** Match threshold 0.35–0.95 */
  similarityThreshold: number;
  compareTimeoutMs: number;
}

export const DEFAULT_REVERSE_IMAGE_MODULE_SETTINGS: ReverseImageModuleSettings =
  {
    isActive: true,
    apiEnabled: true,
    compareUrl:
      process.env.INSIGHTFACE_COMPARE_URL?.trim() ||
      process.env.REVERSE_IMAGE_COMPARE_URL?.trim() ||
      "http://161.97.85.22:8000/compare",
    similarityThreshold: Number.parseFloat(
      process.env.REVERSE_IMAGE_SIMILARITY_THRESHOLD ?? "0.35"
    ),
    compareTimeoutMs: 12_000,
  };
