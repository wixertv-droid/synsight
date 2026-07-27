import type { IdentityView } from "@/lib/services/identity-service";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { readStoredProfileImage } from "@/lib/media/image-pipeline";
import { isGoogleSearchConfigured } from "@/lib/analysis/google/custom-search";
import {
  compareImagesWithInsightFace,
  isInsightFaceConfigured,
  resolveSimilarityThreshold,
} from "@/lib/analysis/reverse-image/insightface-client";
import { planReverseImageQueries } from "@/lib/analysis/reverse-image/search-planner";
import {
  downloadPublicImage,
  fetchGoogleImageCandidates,
  type SerpImageCandidate,
} from "@/lib/analysis/reverse-image/serpapi-images";
import {
  cleanupTempDir,
  deleteTempRelativePath,
  ensureReverseImageDirs,
  persistMatchImage,
  writeTempCandidate,
} from "@/lib/analysis/reverse-image/storage";
import {
  assembleReverseImageReport,
  computeReverseImageRiskScore,
  riskLevelFromSimilarity,
} from "@/lib/analysis/reverse-image/report-metrics";
import {
  completeReverseImageScan,
  createReverseImageScan,
  failReverseImageScan,
  insertReverseImageHit,
} from "@/lib/analysis/reverse-image/repository";
import type {
  ReverseImageHit,
  ReverseImageReport,
} from "@/lib/analysis/reverse-image/types";
import {
  computeExpiresAt,
  parseRetentionDays,
  type ReportRetentionDays,
} from "@/lib/analysis/retention";
import { recordApiUsageEvent } from "@/lib/services/finance-service";

export class ReverseImageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReverseImageUnavailableError";
  }
}

const MAX_CANDIDATES = Number.parseInt(
  process.env.REVERSE_IMAGE_MAX_CANDIDATES ?? "24",
  10
);

interface ReferenceImage {
  type: string;
  analysisPath: string;
  bytes: Buffer;
}

async function loadReferenceImages(
  userId: number,
  identity: IdentityView | null
): Promise<ReferenceImage[]> {
  if (!identity) return [];
  const refs: ReferenceImage[] = [];
  for (const image of identity.images) {
    const path = image.analysisPath || image.storagePath;
    if (!path) continue;
    try {
      const bytes = await readStoredProfileImage(userId, path);
      refs.push({
        type: image.imageType,
        analysisPath: path,
        bytes,
      });
    } catch (error) {
      console.warn(
        "[reverse-image] reference load failed",
        image.imageType,
        error
      );
    }
  }
  return refs;
}

function dedupeCandidates(
  candidates: SerpImageCandidate[]
): SerpImageCandidate[] {
  const seen = new Set<string>();
  const out: SerpImageCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.imageUrl.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

export async function isReverseImageConfigured(): Promise<boolean> {
  return (await isGoogleSearchConfigured()) && isInsightFaceConfigured();
}

export async function runReverseImageSearchScan(
  identity: IdentityView | null,
  options: {
    userId: number;
    retentionDays?: ReportRetentionDays;
  }
): Promise<ReverseImageReport> {
  if (!(await isReverseImageConfigured())) {
    throw new ReverseImageUnavailableError(
      "Reverse Image Search ist nicht konfiguriert (SerpAPI + InsightFace erforderlich)."
    );
  }

  const userId = options.userId;
  const subjectName = resolveSubjectName(identity);
  const references = await loadReferenceImages(userId, identity);

  if (references.length === 0) {
    throw new ReverseImageUnavailableError(
      "Bitte laden Sie mindestens ein Referenzbild im Identitätsprofil hoch."
    );
  }

  const retentionDays = parseRetentionDays(options.retentionDays);
  const expiresAt = computeExpiresAt(new Date().toISOString(), retentionDays);
  const scanId = await createReverseImageScan({
    userId,
    subjectName,
    referenceImageCount: references.length,
    retentionDays,
    expiresAt,
  });

  await ensureReverseImageDirs(userId, scanId);

  const queries = planReverseImageQueries(identity);
  if (queries.length === 0) {
    await failReverseImageScan(
      scanId,
      "Keine Suchbegriffe aus dem Profil ableitbar."
    );
    throw new ReverseImageUnavailableError(
      "Kein Name oder Benutzername im Profil — Suche nicht möglich."
    );
  }

  let allCandidates: SerpImageCandidate[] = [];
  for (const plan of queries) {
    try {
      const batch = await fetchGoogleImageCandidates({
        query: plan.query,
        num: 12,
        userId,
      });
      allCandidates = allCandidates.concat(batch);
    } catch (error) {
      console.error("[reverse-image] serp query failed", plan.query, error);
    }
  }

  const candidates = dedupeCandidates(allCandidates).slice(
    0,
    Number.isFinite(MAX_CANDIDATES) ? MAX_CANDIDATES : 24
  );

  const threshold = resolveSimilarityThreshold();
  const matches: ReverseImageHit[] = [];
  let compareCalls = 0;

  for (const candidate of candidates) {
    const bytes = await downloadPublicImage(candidate.imageUrl);
    if (!bytes) continue;

    let tempPath: string | null = null;
    try {
      tempPath = await writeTempCandidate(userId, scanId, bytes, "jpg");

      let bestSimilarity = 0;
      let bestReference: ReferenceImage | null = null;

      for (const reference of references) {
        compareCalls += 1;
        try {
          const result = await compareImagesWithInsightFace({
            referenceBytes: reference.bytes,
            candidateBytes: bytes,
            referenceName: `${reference.type}.jpg`,
            candidateName: "candidate.jpg",
          });
          if (result.similarity > bestSimilarity) {
            bestSimilarity = result.similarity;
            bestReference = reference;
          }
        } catch (error) {
          console.warn(
            "[reverse-image] compare failed",
            candidate.imageUrl,
            error
          );
        }
      }

      if (bestSimilarity < threshold || !bestReference) {
        if (tempPath) await deleteTempRelativePath(tempPath);
        continue;
      }

      const hitId = `ri-${scanId}-${matches.length + 1}`;
      const stored = await persistMatchImage({
        userId,
        scanId,
        hitId,
        bytes,
      });
      if (tempPath) await deleteTempRelativePath(tempPath);

      const dbHitId = await insertReverseImageHit({
        scanId,
        query: candidate.query,
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        imageUrl: candidate.imageUrl,
        similarity: bestSimilarity,
        referenceImageType: bestReference.type,
        riskLevel: riskLevelFromSimilarity(bestSimilarity),
        storedPath: stored.storedPath,
        thumbnailPath: stored.thumbnailPath,
      });

      matches.push({
        id: String(dbHitId),
        query: candidate.query,
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        imageUrl: candidate.imageUrl,
        similarity: bestSimilarity,
        referenceImageType: bestReference.type,
        riskLevel: riskLevelFromSimilarity(bestSimilarity),
        storedPath: stored.storedPath,
        thumbnailPath: stored.thumbnailPath,
        sourceHost: candidate.sourceHost,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (tempPath)
        await deleteTempRelativePath(tempPath).catch(() => undefined);
      console.warn("[reverse-image] candidate pipeline failed", error);
    }
  }

  await cleanupTempDir(userId, scanId);

  const report = assembleReverseImageReport({
    scanId,
    status: "completed",
    subjectName,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    hits: matches,
    queryCount: queries.length,
    candidateCount: candidates.length,
    referenceImageCount: references.length,
    retentionDays,
    expiresAt,
  });

  await completeReverseImageScan({
    scanId,
    queryCount: queries.length,
    candidateCount: candidates.length,
    matchCount: matches.length,
    riskScore: report.riskScore,
    summary: report.summary ?? report.managementOverview.headline,
  });

  void recordApiUsageEvent({
    providerCode: "insightface",
    eventType: "reverse_image_compare",
    userId,
    analysisId: scanId,
    requestCount: compareCalls,
    detail: `Reverse Image · ${compareCalls} Vergleiche · ${matches.length} Treffer`,
    success: true,
  }).catch(() => undefined);

  return report;
}
