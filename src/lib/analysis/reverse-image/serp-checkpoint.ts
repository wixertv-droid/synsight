import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReverseImageQueryPlan } from "@/lib/analysis/reverse-image/search-planner";
import type { SerpImageCandidate } from "@/lib/analysis/reverse-image/serpapi-images";
import { privateStorageRoot } from "@/lib/analysis/reverse-image/storage";

export const SERP_CHECKPOINT_VERSION = 1 as const;

export interface ReverseImageLiveScanEntry {
  imageUrl: string;
  title: string;
  match: boolean;
  similarity?: number;
  at: string;
}

export interface ReverseImageSerpCheckpoint {
  version: typeof SERP_CHECKPOINT_VERSION;
  queries: ReverseImageQueryPlan[];
  /** SerpAPI query plan ids already fetched (no repeat billing). */
  completedQueryIds: string[];
  /** Deduped candidate list — grows until serpFetchComplete. */
  candidates: SerpImageCandidate[];
  /** imageUrl keys already passed through InsightFace. */
  processedImageUrls: string[];
  serpFetchComplete: boolean;
  updatedAt: string;
  live?: {
    currentImageUrl: string | null;
    currentTitle: string | null;
    recent: ReverseImageLiveScanEntry[];
  };
}

function serpCacheDir(userId: number, scanId: number): string {
  return path.join(
    privateStorageRoot(),
    "reverse-image",
    "users",
    String(userId),
    `scan-${scanId}`,
    "serp-cache"
  );
}

function checkpointPath(userId: number, scanId: number): string {
  return path.join(serpCacheDir(userId, scanId), "checkpoint.json");
}

export function reverseImageSerpCacheDir(
  userId: number,
  scanId: number
): string {
  return serpCacheDir(userId, scanId);
}

function normalizeImageUrl(url: string): string {
  return url.trim().toLowerCase();
}

export function isCandidateProcessed(
  checkpoint: ReverseImageSerpCheckpoint,
  candidate: SerpImageCandidate
): boolean {
  const key = normalizeImageUrl(candidate.imageUrl);
  return checkpoint.processedImageUrls.some(
    (entry) => normalizeImageUrl(entry) === key
  );
}

export function remainingCandidates(
  checkpoint: ReverseImageSerpCheckpoint
): SerpImageCandidate[] {
  return checkpoint.candidates.filter(
    (candidate) => !isCandidateProcessed(checkpoint, candidate)
  );
}

export function scanWorkRemaining(
  checkpoint: ReverseImageSerpCheckpoint
): boolean {
  if (!checkpoint.serpFetchComplete) return true;
  return remainingCandidates(checkpoint).length > 0;
}

export async function readSerpCheckpoint(
  userId: number,
  scanId: number
): Promise<ReverseImageSerpCheckpoint | null> {
  try {
    const raw = await readFile(checkpointPath(userId, scanId), "utf8");
    const parsed = JSON.parse(raw) as ReverseImageSerpCheckpoint;
    if (parsed.version !== SERP_CHECKPOINT_VERSION) return null;
    if (!Array.isArray(parsed.queries) || !Array.isArray(parsed.candidates)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeSerpCheckpoint(
  userId: number,
  scanId: number,
  checkpoint: ReverseImageSerpCheckpoint
): Promise<void> {
  const dir = serpCacheDir(userId, scanId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    checkpointPath(userId, scanId),
    JSON.stringify({ ...checkpoint, updatedAt: new Date().toISOString() }),
    "utf8"
  );
}

export function createEmptySerpCheckpoint(
  queries: ReverseImageQueryPlan[]
): ReverseImageSerpCheckpoint {
  return {
    version: SERP_CHECKPOINT_VERSION,
    queries,
    completedQueryIds: [],
    candidates: [],
    processedImageUrls: [],
    serpFetchComplete: false,
    updatedAt: new Date().toISOString(),
    live: { currentImageUrl: null, currentTitle: null, recent: [] },
  };
}

export function resetCheckpointForRescan(
  checkpoint: ReverseImageSerpCheckpoint
): ReverseImageSerpCheckpoint {
  return {
    ...checkpoint,
    processedImageUrls: [],
    live: { currentImageUrl: null, currentTitle: null, recent: [] },
  };
}

export function setLiveScanCurrent(
  checkpoint: ReverseImageSerpCheckpoint,
  candidate: SerpImageCandidate | null
): ReverseImageSerpCheckpoint {
  return {
    ...checkpoint,
    live: {
      currentImageUrl: candidate?.imageUrl ?? null,
      currentTitle: candidate?.title ?? null,
      recent: checkpoint.live?.recent ?? [],
    },
  };
}

export function appendLiveScanResult(
  checkpoint: ReverseImageSerpCheckpoint,
  entry: ReverseImageLiveScanEntry
): ReverseImageSerpCheckpoint {
  const recent = [...(checkpoint.live?.recent ?? []), entry].slice(-20);
  return {
    ...checkpoint,
    live: {
      currentImageUrl: null,
      currentTitle: null,
      recent,
    },
  };
}

export async function cleanupSerpCache(
  userId: number,
  scanId: number
): Promise<void> {
  await rm(serpCacheDir(userId, scanId), { recursive: true, force: true });
}

export function markQueryFetched(
  checkpoint: ReverseImageSerpCheckpoint,
  queryId: string,
  batch: SerpImageCandidate[],
  maxCandidates: number
): ReverseImageSerpCheckpoint {
  const completedQueryIds = checkpoint.completedQueryIds.includes(queryId)
    ? checkpoint.completedQueryIds
    : [...checkpoint.completedQueryIds, queryId];

  const seen = new Set(
    checkpoint.candidates.map((c) => normalizeImageUrl(c.imageUrl))
  );
  const merged = [...checkpoint.candidates];
  for (const candidate of batch) {
    const key = normalizeImageUrl(candidate.imageUrl);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(candidate);
    if (merged.length >= maxCandidates) break;
  }

  const allQueriesDone = checkpoint.queries.every((plan) =>
    completedQueryIds.includes(plan.id)
  );

  return {
    ...checkpoint,
    completedQueryIds,
    candidates: merged.slice(0, maxCandidates),
    serpFetchComplete: allQueriesDone || merged.length >= maxCandidates,
  };
}

export function markCandidateProcessed(
  checkpoint: ReverseImageSerpCheckpoint,
  imageUrl: string
): ReverseImageSerpCheckpoint {
  const key = normalizeImageUrl(imageUrl);
  if (
    checkpoint.processedImageUrls.some(
      (entry) => normalizeImageUrl(entry) === key
    )
  ) {
    return checkpoint;
  }
  return {
    ...checkpoint,
    processedImageUrls: [...checkpoint.processedImageUrls, imageUrl],
  };
}
