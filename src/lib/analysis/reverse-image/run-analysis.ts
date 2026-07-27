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
  cleanupSerpCache,
  createEmptySerpCheckpoint,
  markCandidateProcessed,
  markQueryFetched,
  readSerpCheckpoint,
  remainingCandidates,
  scanWorkRemaining,
  writeSerpCheckpoint,
} from "@/lib/analysis/reverse-image/serp-checkpoint";
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
  findRunningReverseImageScan,
  getReverseImageHitsForScan,
  getReverseImageReportByScanId,
  getReverseImageScanStatus,
  insertReverseImageHit,
  touchReverseImageScanProgress,
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

type ReverseImageJobsMap = Map<number, Promise<void>>;

function getReverseImageJobs(): ReverseImageJobsMap {
  return ((
    globalThis as unknown as {
      __synsightReverseImageJobs?: ReverseImageJobsMap;
    }
  ).__synsightReverseImageJobs ??= new Map());
}

function resolveMaxCandidates(): number {
  return Number.isFinite(MAX_CANDIDATES) ? MAX_CANDIDATES : 12;
}

function resolveBudgetMs(): number {
  return Number.isFinite(WALL_CLOCK_BUDGET_MS) ? WALL_CLOCK_BUDGET_MS : 75_000;
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

export async function isReverseImageConfigured(): Promise<boolean> {
  return (await isGoogleSearchConfigured()) && isInsightFaceConfigured();
}

export interface ReverseImageStartResult {
  scanId: number;
  status: "running";
  resumed?: boolean;
}

/**
 * Start or resume scan: validate, create/reuse DB row, kick off background pipeline.
 * SerpAPI results are cached on disk until the scan completes without errors.
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

  const jobs = getReverseImageJobs();
  const running = await findRunningReverseImageScan(userId);
  let scanId: number;
  let resumed = false;

  if (running) {
    const checkpoint = await readSerpCheckpoint(userId, running.scanId);
    if (checkpoint && scanWorkRemaining(checkpoint)) {
      scanId = running.scanId;
      resumed = true;
      if (jobs.has(scanId)) {
        return { scanId, status: "running", resumed: true };
      }
    } else if (jobs.has(running.scanId)) {
      return { scanId: running.scanId, status: "running" };
    } else {
      scanId = running.scanId;
      resumed = true;
    }
  } else {
    scanId = await createReverseImageScan({
      userId,
      subjectName,
      referenceImageCount: references.length,
      retentionDays,
      expiresAt,
    });
  }

  await ensureReverseImageDirs(userId, scanId);
  kickOffReverseImagePipeline({
    userId,
    scanId,
    identity,
    subjectName,
    references,
    queries,
    retentionDays,
    expiresAt,
  });

  return { scanId, status: "running", resumed: resumed || undefined };
}

function kickOffReverseImagePipeline(input: {
  userId: number;
  scanId: number;
  identity: IdentityView | null;
  subjectName: string;
  references: ReferenceImage[];
  queries: ReturnType<typeof planReverseImageQueries>;
  retentionDays: ReportRetentionDays;
  expiresAt: string | null;
}): void {
  const jobs = getReverseImageJobs();
  if (jobs.has(input.scanId)) return;

  const job = executeReverseImagePipeline(input).catch(async (error) => {
    console.error("[reverse-image] background pipeline crashed", error);
    const checkpoint = await readSerpCheckpoint(input.userId, input.scanId);
    if (checkpoint && scanWorkRemaining(checkpoint)) {
      console.warn(
        "[reverse-image] keeping scan running — SerpAPI cache preserved for resume",
        input.scanId
      );
      return;
    }
    await failReverseImageScan(
      input.scanId,
      error instanceof Error ? error.message.slice(0, 400) : "Pipeline crash"
    ).catch(() => undefined);
  });

  jobs.set(input.scanId, job);
  void job.finally(() => {
    jobs.delete(input.scanId);
  });
}

async function fetchRemainingSerpCandidates(input: {
  userId: number;
  scanId: number;
  startedAt: number;
  budgetMs: number;
  maxCandidates: number;
}): Promise<{
  checkpoint: Awaited<ReturnType<typeof readSerpCheckpoint>>;
  serpCalls: number;
}> {
  let checkpoint =
    (await readSerpCheckpoint(input.userId, input.scanId)) ?? null;
  let serpCalls = 0;

  if (!checkpoint) {
    throw new Error("SerpAPI-Checkpoint fehlt.");
  }

  if (checkpoint.serpFetchComplete) {
    return { checkpoint, serpCalls };
  }

  for (const plan of checkpoint.queries) {
    if (Date.now() - input.startedAt > input.budgetMs * 0.4) break;
    if (checkpoint.completedQueryIds.includes(plan.id)) continue;
    if (checkpoint.candidates.length >= input.maxCandidates) {
      checkpoint = {
        ...checkpoint,
        serpFetchComplete: true,
      };
      await writeSerpCheckpoint(input.userId, input.scanId, checkpoint);
      break;
    }

    try {
      const batch = await fetchGoogleImageCandidates({
        query: plan.query,
        num: 8,
        userId: input.userId,
      });
      serpCalls += 1;
      checkpoint = markQueryFetched(
        checkpoint,
        plan.id,
        batch,
        input.maxCandidates
      );
      await writeSerpCheckpoint(input.userId, input.scanId, checkpoint);
    } catch (error) {
      console.error("[reverse-image] serp query failed", plan.query, error);
      checkpoint = markQueryFetched(
        checkpoint,
        plan.id,
        [],
        input.maxCandidates
      );
      await writeSerpCheckpoint(input.userId, input.scanId, checkpoint);
    }
  }

  const allDone = checkpoint.queries.every((plan) =>
    checkpoint!.completedQueryIds.includes(plan.id)
  );
  if (allDone || checkpoint.candidates.length >= input.maxCandidates) {
    checkpoint = { ...checkpoint, serpFetchComplete: true };
    await writeSerpCheckpoint(input.userId, input.scanId, checkpoint);
  }

  return { checkpoint, serpCalls };
}

async function processCandidate(input: {
  userId: number;
  scanId: number;
  candidate: SerpImageCandidate;
  references: ReferenceImage[];
  threshold: number;
  startedAt: number;
  budgetMs: number;
  existingMatchCount: number;
}): Promise<{
  hit: ReverseImageHit | null;
  compareCalls: number;
  budgetExceeded: boolean;
}> {
  let compareCalls = 0;

  if (Date.now() - input.startedAt > input.budgetMs) {
    return { hit: null, compareCalls, budgetExceeded: true };
  }

  const bytes = await downloadPublicImage(input.candidate.imageUrl);
  if (!bytes) {
    return { hit: null, compareCalls, budgetExceeded: false };
  }

  let tempPath: string | null = null;
  try {
    tempPath = await writeTempCandidate(
      input.userId,
      input.scanId,
      bytes,
      "jpg"
    );

    let bestSimilarity = 0;
    let bestReference: ReferenceImage | null = null;

    for (const reference of input.references) {
      if (Date.now() - input.startedAt > input.budgetMs) {
        return { hit: null, compareCalls, budgetExceeded: true };
      }
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
        if (result.similarity >= 0.9) break;
      } catch (error) {
        console.warn(
          "[reverse-image] compare failed",
          input.candidate.imageUrl,
          error
        );
      }
    }

    if (bestSimilarity < input.threshold || !bestReference) {
      if (tempPath) await deleteTempRelativePath(tempPath);
      return { hit: null, compareCalls, budgetExceeded: false };
    }

    const hitId = `ri-${input.scanId}-${input.existingMatchCount + 1}`;
    const stored = await persistMatchImage({
      userId: input.userId,
      scanId: input.scanId,
      hitId,
      bytes,
    });
    if (tempPath) await deleteTempRelativePath(tempPath);

    const dbHitId = await insertReverseImageHit({
      scanId: input.scanId,
      query: input.candidate.query,
      title: input.candidate.title,
      sourceUrl: input.candidate.sourceUrl,
      imageUrl: input.candidate.imageUrl,
      similarity: bestSimilarity,
      referenceImageType: bestReference.type,
      riskLevel: riskLevelFromSimilarity(bestSimilarity),
      storedPath: stored.storedPath,
      thumbnailPath: stored.thumbnailPath,
    });

    return {
      hit: {
        id: String(dbHitId),
        query: input.candidate.query,
        title: input.candidate.title,
        sourceUrl: input.candidate.sourceUrl,
        imageUrl: input.candidate.imageUrl,
        similarity: bestSimilarity,
        referenceImageType: bestReference.type,
        riskLevel: riskLevelFromSimilarity(bestSimilarity),
        storedPath: stored.storedPath,
        thumbnailPath: stored.thumbnailPath,
        sourceHost: input.candidate.sourceHost,
        fetchedAt: new Date().toISOString(),
      },
      compareCalls,
      budgetExceeded: false,
    };
  } catch (error) {
    if (tempPath) await deleteTempRelativePath(tempPath).catch(() => undefined);
    console.warn("[reverse-image] candidate pipeline failed", error);
    return { hit: null, compareCalls, budgetExceeded: false };
  }
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
  const budgetMs = resolveBudgetMs();
  const maxCandidates = resolveMaxCandidates();
  let totalCompareCalls = 0;
  const pipelineStartedAt = Date.now();

  try {
    let checkpoint = await readSerpCheckpoint(userId, scanId);
    if (!checkpoint) {
      checkpoint = createEmptySerpCheckpoint(queries);
      await writeSerpCheckpoint(userId, scanId, checkpoint);
    }

    while (scanWorkRemaining(checkpoint)) {
      const chunkStartedAt = Date.now();
      let compareCalls = 0;

      const fetchResult = await fetchRemainingSerpCandidates({
        userId,
        scanId,
        startedAt: chunkStartedAt,
        budgetMs,
        maxCandidates,
      });
      checkpoint = fetchResult.checkpoint!;

      const threshold = resolveSimilarityThreshold();
      let existingHits = await getReverseImageHitsForScan(scanId);
      let budgetExceeded = false;

      const pending = remainingCandidates(checkpoint);
      for (const candidate of pending) {
        const result = await processCandidate({
          userId,
          scanId,
          candidate,
          references,
          threshold,
          startedAt: chunkStartedAt,
          budgetMs,
          existingMatchCount: existingHits.length,
        });
        compareCalls += result.compareCalls;
        totalCompareCalls += result.compareCalls;

        checkpoint = markCandidateProcessed(checkpoint, candidate.imageUrl);
        await writeSerpCheckpoint(userId, scanId, checkpoint);

        if (result.hit) {
          existingHits = [...existingHits, result.hit];
        }

        await touchReverseImageScanProgress({
          scanId,
          queryCount: checkpoint.queries.length,
          candidateCount: checkpoint.candidates.length,
          matchCount: existingHits.length,
        });

        if (result.budgetExceeded) {
          budgetExceeded = true;
          console.warn(
            `[reverse-image] budget reached — ${checkpoint.processedImageUrls.length}/${checkpoint.candidates.length} candidates processed; SerpAPI cache kept`
          );
          break;
        }
      }

      if (!scanWorkRemaining(checkpoint)) {
        await cleanupTempDir(userId, scanId).catch(() => undefined);
        await cleanupSerpCache(userId, scanId).catch(() => undefined);

        const report = assembleReverseImageReport({
          scanId,
          status: "completed",
          subjectName,
          startedAt: new Date(pipelineStartedAt).toISOString(),
          completedAt: new Date().toISOString(),
          hits: existingHits,
          queryCount: checkpoint.queries.length,
          candidateCount: checkpoint.candidates.length,
          referenceImageCount: references.length,
          retentionDays,
          expiresAt,
        });

        await completeReverseImageScan({
          scanId,
          queryCount: checkpoint.queries.length,
          candidateCount: checkpoint.candidates.length,
          matchCount: existingHits.length,
          riskScore: report.riskScore,
          summary: report.summary ?? report.managementOverview.headline,
        });

        if (totalCompareCalls > 0) {
          void recordApiUsageEvent({
            providerCode: "insightface",
            eventType: "reverse_image_compare",
            userId,
            analysisId: scanId,
            requestCount: Math.max(1, totalCompareCalls),
            detail: `Reverse Image · ${totalCompareCalls} Vergleiche · ${existingHits.length} Treffer · ${Date.now() - pipelineStartedAt}ms`,
            success: true,
          }).catch(() => undefined);
        }

        queueThreatsSummaryRegeneration(userId);
        return;
      }

      if (!budgetExceeded) {
        // Serp fetch incomplete within chunk budget — retry next chunk.
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      // Budget exhausted but work remains — pause until next POST/resume.
      return;
    }
  } catch (error) {
    const checkpoint = await readSerpCheckpoint(userId, scanId);
    if (checkpoint && scanWorkRemaining(checkpoint)) {
      console.warn(
        "[reverse-image] error mid-scan — SerpAPI cache preserved",
        scanId,
        error
      );
      return;
    }
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
  progress?: {
    candidatesTotal: number;
    candidatesProcessed: number;
    serpFetchComplete: boolean;
  };
}> {
  const report = await getReverseImageReportByScanId(userId, scanId);
  if (report) return { status: "completed", report };

  const status = await getReverseImageScanStatus(userId, scanId);
  if (status === "failed") return { status: "failed", report: null };
  if (status === "completed") {
    const again = await getReverseImageReportByScanId(userId, scanId);
    return { status: "completed", report: again };
  }

  const checkpoint = await readSerpCheckpoint(userId, scanId);
  const progress = checkpoint
    ? {
        candidatesTotal: checkpoint.candidates.length,
        candidatesProcessed: checkpoint.processedImageUrls.length,
        serpFetchComplete: checkpoint.serpFetchComplete,
      }
    : undefined;

  return { status: "running", report: null, progress };
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
  const deadline = Date.now() + 180_000;
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
