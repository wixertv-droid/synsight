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
  if (similarity >= 0.85) return "high";
  if (similarity >= 0.7) return "medium";
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
  const highConfidenceCount = hits.filter((h) => h.similarity >= 0.85).length;

  let overallRisk: ReverseImageRiskLevel = "low";
  if (highConfidenceCount > 0 || maxSimilarity >= 0.9) overallRisk = "high";
  else if (matchCount > 0 || maxSimilarity >= 0.75) overallRisk = "medium";

  const overallRiskLabel =
    overallRisk === "high"
      ? "Hohe visuelle Übereinstimmung"
      : overallRisk === "medium"
        ? "Auffällige Bildtreffer"
        : status === "discovery_complete" || status === "discovering"
          ? "Bildsuche abgeschlossen — Auswahl ausstehend"
          : "Keine kritischen Treffer";

  const headline =
    matchCount > 0
      ? `${matchCount} visuelle Treffer über öffentliche Google-Index-Vorschauen (max. ${Math.round(maxSimilarity * 100)} % Ähnlichkeit).`
      : status === "discovery_complete" || status === "discovering"
        ? `${candidateCount} Bildlinks gespeichert — bitte Quellen prüfen und Gesichtsvergleich starten.`
        : candidateCount > 0
          ? `${candidateCount} Kandidaten geprüft — keine Übereinstimmung über dem Schwellenwert.`
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
  };
}

export function computeReverseImageRiskScore(hits: ReverseImageHit[]): number {
  if (hits.length === 0) return 0;
  let sum = 0;
  for (const hit of hits) {
    const pct = hit.similarity * 100;
    if (pct >= 90) sum += 42;
    else if (pct >= 80) sum += 30;
    else if (pct >= 70) sum += 18;
    else sum += 10;
  }
  return clampScore(100 * (1 - Math.exp(-sum / 48)));
}

export function buildReverseImageSummary(
  overview: ReverseImageManagementOverview
): string {
  return overview.headline;
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
    moduleKey: "reverse_image_search",
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
