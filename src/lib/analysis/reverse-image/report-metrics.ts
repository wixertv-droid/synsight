import type {
  ReverseImageHit,
  ReverseImageManagementOverview,
  ReverseImageReport,
  ReverseImageRiskLevel,
} from "@/lib/analysis/reverse-image/types";

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function riskLevelFromSimilarity(
  similarity: number
): ReverseImageRiskLevel {
  if (similarity >= 0.82) return "high";
  if (similarity >= 0.62) return "medium";
  return "low";
}

export function buildManagementOverview(
  hits: ReverseImageHit[],
  candidateCount: number,
  queryCount: number,
  referenceImageCount: number,
  status?: ReverseImageReport["status"]
): ReverseImageManagementOverview {
  const matchCount = hits.length;
  const similarities = hits.map((h) => h.similarity);
  const avgSimilarity =
    similarities.length > 0
      ? similarities.reduce((a, b) => a + b, 0) / similarities.length
      : 0;
  const maxSimilarity = similarities.length > 0 ? Math.max(...similarities) : 0;
  const highConfidenceCount = hits.filter((h) => h.similarity >= 0.8).length;
  const relevantImageCount = hits.length;
  const possiblePersonImageCount = hits.filter((h) =>
    ["portrait", "selfie", "person", "group", "avatar", "unknown"].includes(
      h.imageKind ?? "unknown"
    )
  ).length;
  const socialMediaCount = hits.filter((h) =>
    /(instagram|facebook|linkedin|tiktok|x\.com|twitter|youtube|pinterest)/i.test(
      h.sourceHost ?? ""
    )
  ).length;
  const publicWebsiteCount = Math.max(0, hits.length - socialMediaCount);
  const confidenceScore =
    similarities.length > 0
      ? Math.round(
          similarities.reduce((sum, value) => sum + value * 100, 0) /
            similarities.length
        )
      : 0;
  const discardedImageCount = Math.max(0, candidateCount - relevantImageCount);

  let overallRisk: ReverseImageRiskLevel = "low";
  if (highConfidenceCount >= 3 || maxSimilarity >= 0.85) overallRisk = "high";
  else if (matchCount > 0 || maxSimilarity >= 0.65) overallRisk = "medium";

  const overallRiskLabel =
    overallRisk === "high"
      ? "Hohe öffentliche Bildexposition"
      : overallRisk === "medium"
        ? "Auffällige öffentliche Bildsignale"
        : status === "discovery_complete" || status === "discovering"
          ? "Smart Discovery abgeschlossen"
          : "Keine kritischen Treffer";

  const headline =
    matchCount > 0
      ? `${matchCount} relevante öffentliche Bildtreffer erkannt (${socialMediaCount} Social-Media, ${publicWebsiteCount} Webseiten).`
      : status === "discovery_complete" || status === "discovering"
        ? `${candidateCount} Bildkandidaten wurden analysiert. Keine relevanten öffentlichen Personenbilder blieben übrig.`
        : candidateCount > 0
          ? `${candidateCount} Kandidaten geprüft — keine relevanten öffentlichen Personenbilder gefunden.`
          : "Keine verwertbaren Bildkandidaten in der Index-Suche gefunden.";

  return {
    headline,
    overallRisk,
    overallRiskLabel,
    matchCount,
    candidateCount,
    queryCount,
    referenceImageCount,
    avgSimilarity,
    maxSimilarity,
    highConfidenceCount,
    relevantImageCount,
    discardedImageCount,
    socialMediaCount,
    publicWebsiteCount,
    possiblePersonImageCount,
    confidenceScore,
  };
}

export function computeReverseImageRiskScore(hits: ReverseImageHit[]): number {
  if (hits.length === 0) return 0;
  let sum = 0;
  for (const hit of hits) {
    const pct = hit.similarity * 100;
    const bandBonus =
      hit.riskBand === "critical"
        ? 18
        : hit.riskBand === "identity"
          ? 12
          : hit.riskBand === "public"
            ? 8
            : 2;
    if (pct >= 85) sum += 36 + bandBonus;
    else if (pct >= 70) sum += 24 + bandBonus;
    else if (pct >= 55) sum += 14 + bandBonus;
    else sum += 8 + bandBonus;
  }
  return clampScore(100 * (1 - Math.exp(-sum / 48)));
}

export function buildReverseImageSummary(
  overview: ReverseImageManagementOverview
): string {
  return `${overview.headline} ${overview.discardedImageCount} unpassende oder technische Bilder wurden automatisch verworfen. Confidence ${overview.confidenceScore}/100.`;
}

export function assembleReverseImageReport(input: {
  scanId: number;
  status: ReverseImageReport["status"];
  subjectName: string;
  startedAt: string | null;
  completedAt: string | null;
  hits: ReverseImageHit[];
  queryCount: number;
  candidateCount: number;
  referenceImageCount: number;
  retentionDays: number;
  expiresAt: string | null;
}): ReverseImageReport {
  const managementOverview = buildManagementOverview(
    input.hits,
    input.candidateCount,
    input.queryCount,
    input.referenceImageCount,
    input.status
  );
  const riskScore = computeReverseImageRiskScore(input.hits);

  return {
    scanId: input.scanId,
    moduleKey: "public_image_exposure_scan",
    status: input.status,
    subjectName: input.subjectName,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    riskScore,
    summary: buildReverseImageSummary(managementOverview),
    queryCount: input.queryCount,
    candidateCount: input.candidateCount,
    matchCount: input.hits.length,
    referenceImageCount: input.referenceImageCount,
    retentionDays: input.retentionDays,
    expiresAt: input.expiresAt,
    hits: input.hits,
    managementOverview,
  };
}
