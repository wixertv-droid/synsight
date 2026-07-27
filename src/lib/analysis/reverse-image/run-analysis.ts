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
  riskLevelFromSimilarity,
} from "@/lib/analysis/reverse-image/report-metrics";
import {
  completeReverseImageScan,
  createReverseImageScan,
  failReverseImageScan,
  getReverseImageReportByScanId,
  getReverseImageScanStatus,
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
import { queueThreatsSummaryRegeneration } from "@/lib/services/threats-summary-service";

export class ReverseImageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReverseImageUnavailableError";
  }
}

/** Keep scans short enough for typical nginx proxy timeouts. */
const MAX_CANDIDATES = Number.parseInt(
  process.env.REVERSE_IMAGE_MAX_CANDIDATES ?? "12",
  10
);
const WALL_CLOCK_BUDGET_MS = Number.parseInt(
  process.env.REVERSE_IMAGE_BUDGET_MS ?? "75000",
  10
);
const MAX_REFERENCES = Number.parseInt(
  process.env.REVERSE_IMAGE_MAX_REFERENCES ?? "2",
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
  const preferred = ["front", "angled", "left_profile", "right_profile"];
  const sorted = [...identity.images].sort((a, b) => {
    const ai = preferred.indexOf(a.imageType);
    const bi = preferred.indexOf(b.imageType);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  for (const image of sorted) {
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
  return refs.slice(0, Number.isFinite(MAX_REFERENCES) ? MAX_REFERENCES : 2);
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

export interface ReverseImageStartResult {
  scanId: number;
  status: "running";
}

/**
 * Start scan: validate, create DB row, kick off background pipeline.
 * Returns immediately so nginx does not 502 on long InsightFace loops.
 */
export async function startReverseImageSearchScan(
  identity: IdentityView | null,
  options: {
    userId: number;
    retentionDays?: ReportRetentionDays;
  }
): Promise<ReverseImageStartResult> {
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

  const queries = planReverseImageQueries(identity);
  if (queries.length === 0) {
    throw new ReverseImageUnavailableError(
      "Kein Name oder Benutzername im Profil — Suche nicht möglich."
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

  // Keep a strong reference so the Node process does not GC the job after
  // the HTTP response ends (common cause of incomplete reverse-image scans).
  const jobs = ((
    globalThis as unknown as {
      __synsightReverseImageJobs?: Map<number, Promise<void>>;
    }
  ).__synsightReverseImageJobs ??= new Map());

  const job = executeReverseImagePipeline({
    userId,
    scanId,
    identity,
    subjectName,
    references,
    queries,
    retentionDays,
    expiresAt,
  }).catch(async (error) => {
    console.error("[reverse-image] background pipeline crashed", error);
    await failReverseImageScan(
      scanId,
      error instanceof Error ? error.message.slice(0, 400) : "Pipeline crash"
    ).catch(() => undefined);
  });

  jobs.set(scanId, job);
  void job.finally(() => {
    jobs.delete(scanId);
  });

  return { scanId, status: "running" };
}

async function executeReverseImagePipeline(input: {
  userId: number;
  scanId: number;
  identity: IdentityView | null;
  subjectName: string;
  references: ReferenceImage[];
  queries: ReturnType<typeof planReverseImageQueries>;
  retentionDays: ReportRetentionDays;
  expiresAt: string | null;
}): Promise<void> {
  const {
    userId,
    scanId,
    subjectName,
    references,
    queries,
    retentionDays,
    expiresAt,
  } = input;
  const startedAt = Date.now();
  const budgetMs = Number.isFinite(WALL_CLOCK_BUDGET_MS)
    ? WALL_CLOCK_BUDGET_MS
    : 75_000;

  try {
    let allCandidates: SerpImageCandidate[] = [];
    for (const plan of queries) {
      if (Date.now() - startedAt > budgetMs * 0.35) break;
      try {
        const batch = await fetchGoogleImageCandidates({
          query: plan.query,
          num: 8,
          userId,
        });
        allCandidates = allCandidates.concat(batch);
      } catch (error) {
        console.error("[reverse-image] serp query failed", plan.query, error);
      }
    }

    const candidates = dedupeCandidates(allCandidates).slice(
      0,
      Number.isFinite(MAX_CANDIDATES) ? MAX_CANDIDATES : 12
    );

    const threshold = resolveSimilarityThreshold();
    const matches: ReverseImageHit[] = [];
    let compareCalls = 0;

    for (const candidate of candidates) {
      if (Date.now() - startedAt > budgetMs) {
        console.warn(
          `[reverse-image] wall-clock budget reached after ${matches.length} matches / ${candidates.length} candidates`
        );
        break;
      }

      const bytes = await downloadPublicImage(candidate.imageUrl);
      if (!bytes) continue;

      let tempPath: string | null = null;
      try {
        tempPath = await writeTempCandidate(userId, scanId, bytes, "jpg");

        let bestSimilarity = 0;
        let bestReference: ReferenceImage | null = null;

        for (const reference of references) {
          if (Date.now() - startedAt > budgetMs) break;
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
            // Strong match — no need to try more references for this candidate
            if (result.similarity >= 0.9) break;
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

    await cleanupTempDir(userId, scanId).catch(() => undefined);

    const report = assembleReverseImageReport({
      scanId,
      status: "completed",
      subjectName,
      startedAt: new Date(startedAt).toISOString(),
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
      requestCount: Math.max(1, compareCalls),
      detail: `Reverse Image · ${compareCalls} Vergleiche · ${matches.length} Treffer · ${Date.now() - startedAt}ms`,
      success: true,
    }).catch(() => undefined);

    queueThreatsSummaryRegeneration(userId);
  } catch (error) {
    await cleanupTempDir(userId, scanId).catch(() => undefined);
    await failReverseImageScan(
      scanId,
      error instanceof Error
        ? error.message.slice(0, 400)
        : "Scan fehlgeschlagen"
    );
    throw error;
  }
}

/** Prefer completed report; used by polling clients. */
export async function getReverseImageScanOutcome(
  userId: number,
  scanId: number
): Promise<{
  status: "running" | "completed" | "failed";
  report: ReverseImageReport | null;
}> {
  const report = await getReverseImageReportByScanId(userId, scanId);
  if (report) return { status: "completed", report };

  // Probe scan row for failed/running
  const status = await getReverseImageScanStatus(userId, scanId);
  if (status === "failed") return { status: "failed", report: null };
  if (status === "completed") {
    const again = await getReverseImageReportByScanId(userId, scanId);
    return { status: "completed", report: again };
  }
  return { status: "running", report: null };
}

/**
 * Legacy sync entry — kept for tests; prefer startReverseImageSearchScan.
 */
export async function runReverseImageSearchScan(
  identity: IdentityView | null,
  options: {
    userId: number;
    retentionDays?: ReportRetentionDays;
  }
): Promise<ReverseImageReport> {
  const started = await startReverseImageSearchScan(identity, options);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    const outcome = await getReverseImageScanOutcome(
      options.userId,
      started.scanId
    );
    if (outcome.status === "completed" && outcome.report) return outcome.report;
    if (outcome.status === "failed") {
      throw new ReverseImageUnavailableError(
        "Reverse Image Search ist fehlgeschlagen."
      );
    }
  }
  throw new ReverseImageUnavailableError(
    "Reverse Image Search hat das Zeitlimit überschritten."
  );
}
