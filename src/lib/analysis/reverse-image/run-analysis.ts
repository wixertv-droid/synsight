import type { IdentityView } from "@/lib/services/identity-service";
import { resolveSubjectName } from "@/lib/analysis/google/queries";
import { readStoredProfileImage } from "@/lib/media/image-pipeline";
import { isGoogleSearchConfigured } from "@/lib/analysis/google/custom-search";
import {
  compareImagesWithInsightFace,
  isInsightFaceConfiguredAsync,
  resolveSimilarityThresholdAsync,
} from "@/lib/analysis/reverse-image/insightface-client";
import { planReverseImageQueries } from "@/lib/analysis/reverse-image/search-planner";
import {
  downloadPublicImage,
  fetchGoogleImageCandidates,
  type SerpImageCandidate,
} from "@/lib/analysis/reverse-image/serpapi-images";
import {
  addManualCandidate,
  allCandidates,
  appendLiveScanResult,
  compareWorkRemaining,
  createEmptySerpCheckpoint,
  discoveryWorkRemaining,
  groupLabelsFromCheckpoint,
  markCandidateProcessed,
  markQueryFetched,
  parseSerpCheckpointJson,
  readSerpCheckpoint,
  remainingCompareCandidates,
  resetCheckpointForCompare,
  selectedCandidates,
  setLiveScanCurrent,
  setSelectedImageUrls,
  writeSerpCheckpoint,
  type ReverseImageLiveScanEntry,
  type ReverseImageSerpCheckpoint,
} from "@/lib/analysis/reverse-image/serp-checkpoint";
import {
  cleanupTempDir,
  deleteTempRelativePath,
  ensureReverseImageDirs,
  persistMatchImage,
  writeTempCandidate,
  cleanupReverseImageScanStorage,
} from "@/lib/analysis/reverse-image/storage";
import {
  assembleReverseImageReport,
  riskLevelFromSimilarity,
} from "@/lib/analysis/reverse-image/report-metrics";
import {
  clearReverseImageHitsForScan,
  completeReverseImageDiscovery,
  completeReverseImageScan,
  createReverseImageScan,
  failReverseImageScan,
  findRunningReverseImageScan,
  getReverseImageHitsForScan,
  getReverseImageReportByScanId,
  getReverseImageScanMeta,
  getReverseImageScanStatus,
  insertReverseImageHit,
  loadReverseImageSerpCache,
  markReverseImageScanComparing,
  resetReverseImageScanForRescan,
  saveReverseImageSerpCache,
  touchReverseImageScanProgress,
} from "@/lib/analysis/reverse-image/repository";
import type {
  ReverseImageHit,
  ReverseImageReport,
} from "@/lib/analysis/reverse-image/types";
import {
  computeExpiresAt,
  isReportExpired,
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

function resolveBudgetMs(): number {
  return Number.isFinite(WALL_CLOCK_BUDGET_MS) ? WALL_CLOCK_BUDGET_MS : 75_000;
}

async function persistCheckpoint(
  userId: number,
  scanId: number,
  checkpoint: ReverseImageSerpCheckpoint
): Promise<void> {
  await writeSerpCheckpoint(userId, scanId, checkpoint, async (payload) => {
    await saveReverseImageSerpCache(scanId, payload);
  });
}

export async function loadCheckpointForScan(
  userId: number,
  scanId: number
): Promise<ReverseImageSerpCheckpoint | null> {
  // DB is durable across deploys/restarts; disk can be wiped. Prefer richer set.
  const fromDb = parseSerpCheckpointJson(
    await loadReverseImageSerpCache(scanId)
  );
  const fromDisk = await readSerpCheckpoint(userId, scanId);
  if (fromDb && fromDisk) {
    const dbCount = fromDb.candidates.length;
    const diskCount = fromDisk.candidates.length;
    if (diskCount > dbCount) return fromDisk;
    return fromDb;
  }
  return fromDb ?? fromDisk;
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
      refs.push({ type: image.imageType, analysisPath: path, bytes });
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
  return (
    (await isGoogleSearchConfigured()) && (await isInsightFaceConfiguredAsync())
  );
}

export async function isReverseImageDiscoveryConfigured(): Promise<boolean> {
  return isGoogleSearchConfigured();
}

export interface ReverseImageStartResult {
  scanId: number;
  status: "discovering" | "comparing";
  resumed?: boolean;
}

/** Phase 1 — SerpAPI Bildlinks sammeln (ohne InsightFace). */
export async function startReverseImageDiscovery(
  identity: IdentityView | null,
  options: { userId: number; retentionDays?: ReportRetentionDays }
): Promise<ReverseImageStartResult> {
  if (!(await isReverseImageDiscoveryConfigured())) {
    throw new ReverseImageUnavailableError(
      "Reverse Image Bildsuche ist nicht konfiguriert (SerpAPI erforderlich)."
    );
  }

  const userId = options.userId;
  const subjectName = resolveSubjectName(identity);
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
    const checkpoint = await loadCheckpointForScan(userId, running.scanId);
    if (checkpoint && discoveryWorkRemaining(checkpoint)) {
      scanId = running.scanId;
      resumed = true;
      if (jobs.has(scanId))
        return { scanId, status: "discovering", resumed: true };
    } else if (jobs.has(running.scanId)) {
      return { scanId: running.scanId, status: "discovering" };
    } else {
      scanId = running.scanId;
      resumed = true;
    }
  } else {
    scanId = await createReverseImageScan({
      userId,
      subjectName,
      referenceImageCount: 0,
      retentionDays,
      expiresAt,
    });
  }

  await ensureReverseImageDirs(userId, scanId);
  kickOffDiscoveryPipeline({
    userId,
    scanId,
    identity,
    subjectName,
    queries,
    retentionDays,
    expiresAt,
  });
  return { scanId, status: "discovering", resumed: resumed || undefined };
}

/** Phase 2 — InsightFace nur auf ausgewählte Links. */
export async function startReverseImageCompare(
  identity: IdentityView | null,
  options: {
    userId: number;
    scanId: number;
    selectedImageUrls?: string[];
  }
): Promise<ReverseImageStartResult> {
  if (!(await isInsightFaceConfiguredAsync())) {
    throw new ReverseImageUnavailableError(
      "Face-Erkennung ist nicht konfiguriert (InsightFace erforderlich)."
    );
  }

  const userId = options.userId;
  const scanId = options.scanId;
  const scan = await getReverseImageScanMeta(userId, scanId);
  if (!scan) throw new ReverseImageUnavailableError("Scan nicht gefunden.");
  if (isReportExpired({ expiresAt: scan.expires_at })) {
    throw new ReverseImageUnavailableError("Der Scan ist abgelaufen.");
  }

  let checkpoint = await loadCheckpointForScan(userId, scanId);
  if (!checkpoint?.serpFetchComplete) {
    throw new ReverseImageUnavailableError(
      "Bildsuche noch nicht abgeschlossen — bitte zuerst Quellen laden."
    );
  }

  const references = await loadReferenceImages(userId, identity);
  if (references.length === 0) {
    throw new ReverseImageUnavailableError(
      "Bitte laden Sie mindestens ein Referenzbild im Identitätsprofil hoch."
    );
  }

  const selected = options.selectedImageUrls?.length
    ? options.selectedImageUrls
    : checkpoint.selectedImageUrls;
  if (!selected.length) {
    throw new ReverseImageUnavailableError(
      "Bitte wählen Sie mindestens ein Bild zum Vergleich aus."
    );
  }

  await clearReverseImageHitsForScan(scanId);
  await resetReverseImageScanForRescan(scanId);
  checkpoint = resetCheckpointForCompare(
    setSelectedImageUrls(checkpoint, selected),
    selected
  );
  checkpoint = { ...checkpoint, phase: "comparing" };
  await persistCheckpoint(userId, scanId, checkpoint);
  await markReverseImageScanComparing(scanId);

  kickOffComparePipeline({
    userId,
    scanId,
    subjectName: scan.subject_name ?? resolveSubjectName(identity),
    references,
    retentionDays: scan.retention_days as ReportRetentionDays,
    expiresAt: scan.expires_at,
  });

  return { scanId, status: "comparing" };
}

/** @deprecated Alias — nutzt Phase-1 Discovery */
export async function startReverseImageSearchScan(
  identity: IdentityView | null,
  options: { userId: number; retentionDays?: ReportRetentionDays }
): Promise<{ scanId: number; status: "running"; resumed?: boolean }> {
  const started = await startReverseImageDiscovery(identity, options);
  return {
    scanId: started.scanId,
    status: "running",
    resumed: started.resumed,
  };
}

/** @deprecated nutzt startReverseImageCompare */
export async function startReverseImageRescan(
  identity: IdentityView | null,
  options: { userId: number; scanId: number }
): Promise<{ scanId: number; status: "running"; rescan?: boolean }> {
  const started = await startReverseImageCompare(identity, options);
  return { scanId: started.scanId, status: "running", rescan: true };
}

export async function saveReverseImageSelection(input: {
  userId: number;
  scanId: number;
  selectedImageUrls: string[];
  manualCandidate?: {
    imageUrl: string;
    title?: string;
    sourceUrl?: string | null;
  };
}): Promise<void> {
  let checkpoint = await loadCheckpointForScan(input.userId, input.scanId);
  if (!checkpoint)
    throw new ReverseImageUnavailableError("Scan-Daten nicht gefunden.");

  if (input.manualCandidate?.imageUrl?.trim()) {
    const url = input.manualCandidate.imageUrl.trim();
    checkpoint = addManualCandidate(checkpoint, {
      title: input.manualCandidate.title?.trim() || "Manuell hinzugefügt",
      imageUrl: url,
      sourceUrl: input.manualCandidate.sourceUrl ?? null,
      sourceHost: "manual",
      query: "manual",
      position: 0,
      queryId: "manual",
      queryGroup: "username",
      queryLabel: "Manuell",
    });
  }

  checkpoint = setSelectedImageUrls(checkpoint, input.selectedImageUrls);
  await persistCheckpoint(input.userId, input.scanId, checkpoint);
}

export async function getReverseImageSerpSources(
  userId: number,
  scanId: number
): Promise<{
  scanId: number;
  candidates: SerpImageCandidate[];
  resultsByQuery: Record<string, SerpImageCandidate[]>;
  groups: ReturnType<typeof groupLabelsFromCheckpoint>;
  queries: ReverseImageSerpCheckpoint["queries"];
  serpFetchComplete: boolean;
  selectedImageUrls: string[];
  retentionDays: number;
  expiresAt: string | null;
} | null> {
  const scan = await getReverseImageScanMeta(userId, scanId);
  if (!scan || isReportExpired({ expiresAt: scan.expires_at })) {
    if (scan && isReportExpired({ expiresAt: scan.expires_at })) {
      await cleanupReverseImageScanStorage(userId, scanId).catch(
        () => undefined
      );
    }
    return null;
  }

  const checkpoint = await loadCheckpointForScan(userId, scanId);
  if (!checkpoint) return null;

  return {
    scanId,
    candidates: checkpoint.candidates,
    resultsByQuery: checkpoint.resultsByQuery,
    groups: groupLabelsFromCheckpoint(checkpoint),
    queries: checkpoint.queries,
    serpFetchComplete: checkpoint.serpFetchComplete,
    selectedImageUrls: checkpoint.selectedImageUrls,
    retentionDays: scan.retention_days,
    expiresAt: scan.expires_at,
  };
}

export function buildProxyImageUrl(scanId: number, imageUrl: string): string {
  return `/api/analysis/reverse-image/proxy-image?scanId=${scanId}&url=${encodeURIComponent(imageUrl)}`;
}

function kickOffDiscoveryPipeline(input: {
  userId: number;
  scanId: number;
  identity: IdentityView | null;
  subjectName: string;
  queries: ReturnType<typeof planReverseImageQueries>;
  retentionDays: ReportRetentionDays;
  expiresAt: string | null;
}): void {
  const jobs = getReverseImageJobs();
  if (jobs.has(input.scanId)) return;

  const job = executeDiscoveryPipeline(input).catch(async (error) => {
    console.error("[reverse-image] discovery crashed", error);
    const checkpoint = await loadCheckpointForScan(input.userId, input.scanId);
    if (checkpoint && discoveryWorkRemaining(checkpoint)) return;
    await failReverseImageScan(
      input.scanId,
      error instanceof Error
        ? error.message.slice(0, 400)
        : "Discovery fehlgeschlagen"
    );
  });

  jobs.set(input.scanId, job);
  void job.finally(() => jobs.delete(input.scanId));
}

function kickOffComparePipeline(input: {
  userId: number;
  scanId: number;
  subjectName: string;
  references: ReferenceImage[];
  retentionDays: ReportRetentionDays;
  expiresAt: string | null;
}): void {
  const jobs = getReverseImageJobs();
  if (jobs.has(input.scanId)) return;

  const job = executeComparePipeline(input).catch(async (error) => {
    console.error("[reverse-image] compare crashed", error);
    const checkpoint = await loadCheckpointForScan(input.userId, input.scanId);
    if (checkpoint && compareWorkRemaining(checkpoint)) return;
    await failReverseImageScan(
      input.scanId,
      error instanceof Error
        ? error.message.slice(0, 400)
        : "Vergleich fehlgeschlagen"
    );
  });

  jobs.set(input.scanId, job);
  void job.finally(() => jobs.delete(input.scanId));
}

async function executeDiscoveryPipeline(input: {
  userId: number;
  scanId: number;
  queries: ReturnType<typeof planReverseImageQueries>;
  subjectName: string;
}): Promise<void> {
  const { userId, scanId, queries, subjectName } = input;
  const budgetMs = resolveBudgetMs();

  let checkpoint = await loadCheckpointForScan(userId, scanId);
  if (!checkpoint) {
    checkpoint = createEmptySerpCheckpoint(queries);
    await persistCheckpoint(userId, scanId, checkpoint);
  }

  while (discoveryWorkRemaining(checkpoint)) {
    const chunkStartedAt = Date.now();
    for (const plan of checkpoint.queries) {
      if (Date.now() - chunkStartedAt > budgetMs * 0.85) break;
      if (checkpoint.completedQueryIds.includes(plan.id)) continue;

      try {
        const batch = await fetchGoogleImageCandidates({
          query: plan.query,
          // Tiefe wie manuelle Google-Bildsuche: mehrere Seiten (ijn), nicht nur ~12 Treffer.
          userId,
        });
        checkpoint = markQueryFetched(checkpoint, plan, batch);
      } catch (error) {
        console.error("[reverse-image] serp query failed", plan.query, error);
        checkpoint = markQueryFetched(checkpoint, plan, []);
      }
      await persistCheckpoint(userId, scanId, checkpoint);
    }

    if (!discoveryWorkRemaining(checkpoint)) break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (discoveryWorkRemaining(checkpoint)) return;

  checkpoint = { ...checkpoint, phase: "discovery_complete" };
  await persistCheckpoint(userId, scanId, checkpoint);

  await completeReverseImageDiscovery({
    scanId,
    queryCount: checkpoint.queries.length,
    candidateCount: checkpoint.candidates.length,
    summary: `${checkpoint.candidates.length} Bildlinks gefunden für ${subjectName} — bitte Auswahl treffen und Vergleich starten.`,
  });
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
  if (!bytes) return { hit: null, compareCalls, budgetExceeded: false };

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
      query: candidateLabel(input.candidate),
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
        query: candidateLabel(input.candidate),
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

function candidateLabel(candidate: SerpImageCandidate): string {
  return candidate.queryLabel ?? candidate.query;
}

async function executeComparePipeline(input: {
  userId: number;
  scanId: number;
  subjectName: string;
  references: ReferenceImage[];
  retentionDays: ReportRetentionDays;
  expiresAt: string | null;
}): Promise<void> {
  const { userId, scanId, subjectName, references, retentionDays, expiresAt } =
    input;
  const budgetMs = resolveBudgetMs();
  const pipelineStartedAt = Date.now();
  let totalCompareCalls = 0;

  let checkpoint = await loadCheckpointForScan(userId, scanId);
  if (!checkpoint) throw new Error("Checkpoint fehlt.");

  while (compareWorkRemaining(checkpoint)) {
    const chunkStartedAt = Date.now();
    let compareCalls = 0;
    const threshold = await resolveSimilarityThresholdAsync();
    let existingHits = await getReverseImageHitsForScan(scanId);
    let budgetExceeded = false;

    for (const candidate of remainingCompareCandidates(checkpoint)) {
      checkpoint = setLiveScanCurrent(checkpoint, candidate);
      await persistCheckpoint(userId, scanId, checkpoint);

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

      const liveEntry: ReverseImageLiveScanEntry = {
        imageUrl: candidate.imageUrl,
        title: candidate.title,
        match: Boolean(result.hit),
        similarity: result.hit?.similarity,
        at: new Date().toISOString(),
      };
      checkpoint = appendLiveScanResult(
        markCandidateProcessed(checkpoint, candidate.imageUrl),
        liveEntry
      );
      await persistCheckpoint(userId, scanId, checkpoint);

      if (result.hit) existingHits = [...existingHits, result.hit];
      await touchReverseImageScanProgress({
        scanId,
        queryCount: checkpoint.queries.length,
        candidateCount: checkpoint.candidates.length,
        matchCount: existingHits.length,
      });

      if (result.budgetExceeded) {
        budgetExceeded = true;
        break;
      }
    }

    if (!compareWorkRemaining(checkpoint)) {
      await cleanupTempDir(userId, scanId).catch(() => undefined);
      checkpoint = { ...checkpoint, phase: "completed" };
      await persistCheckpoint(userId, scanId, checkpoint);

      const report = assembleReverseImageReport({
        scanId,
        status: "completed",
        subjectName,
        startedAt: new Date(pipelineStartedAt).toISOString(),
        completedAt: new Date().toISOString(),
        hits: existingHits,
        queryCount: checkpoint.queries.length,
        // Discovery-Pool behalten — nicht nur die Auswahl für den Vergleich.
        candidateCount: allCandidates(checkpoint).length,
        referenceImageCount: references.length,
        retentionDays,
        expiresAt,
      });

      await completeReverseImageScan({
        scanId,
        queryCount: checkpoint.queries.length,
        candidateCount: allCandidates(checkpoint).length,
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
          detail: `Reverse Image · ${totalCompareCalls} Vergleiche · ${existingHits.length} Treffer`,
          success: true,
        }).catch(() => undefined);
      }

      queueThreatsSummaryRegeneration(userId);
      return;
    }

    if (!budgetExceeded) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      continue;
    }
    return;
  }
}

export async function getReverseImageScanOutcome(
  userId: number,
  scanId: number
): Promise<{
  status:
    | "discovering"
    | "discovery_complete"
    | "comparing"
    | "running"
    | "completed"
    | "failed";
  report: ReverseImageReport | null;
  progress?: {
    candidatesTotal: number;
    candidatesProcessed: number;
    serpFetchComplete: boolean;
  };
  live?: ReverseImageSerpCheckpoint["live"];
  liveHits?: ReverseImageHit[];
  sources?: Awaited<ReturnType<typeof getReverseImageSerpSources>>;
}> {
  const report = await getReverseImageReportByScanId(userId, scanId);
  if (report) return { status: "completed", report };

  const status = await getReverseImageScanStatus(userId, scanId);
  if (status === "failed") return { status: "failed", report: null };
  if (status === "completed") {
    return {
      status: "completed",
      report: await getReverseImageReportByScanId(userId, scanId),
    };
  }

  const checkpoint = await loadCheckpointForScan(userId, scanId);
  const sources = await getReverseImageSerpSources(userId, scanId);
  const liveHits = await getReverseImageHitsForScan(scanId);

  const progress = checkpoint
    ? {
        candidatesTotal:
          checkpoint.phase === "comparing"
            ? selectedCandidates(checkpoint).length
            : checkpoint.candidates.length,
        candidatesProcessed: checkpoint.processedImageUrls.length,
        serpFetchComplete: checkpoint.serpFetchComplete,
      }
    : undefined;

  const mappedStatus =
    status === "discovering" ||
    status === "discovery_complete" ||
    status === "comparing"
      ? status
      : status === "running"
        ? "discovering"
        : "discovering";

  return {
    status: mappedStatus,
    report: null,
    progress,
    live: checkpoint?.live,
    liveHits,
    sources: sources ?? undefined,
  };
}

export async function runReverseImageSearchScan(
  identity: IdentityView | null,
  options: { userId: number; retentionDays?: ReportRetentionDays }
): Promise<ReverseImageReport> {
  const started = await startReverseImageDiscovery(identity, options);
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
