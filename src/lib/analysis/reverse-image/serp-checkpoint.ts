import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ReverseImageQueryGroup,
  ReverseImageQueryPlan,
} from "@/lib/analysis/reverse-image/search-planner";
import type { SerpImageCandidate } from "@/lib/analysis/reverse-image/serpapi-images";
import { privateStorageRoot } from "@/lib/analysis/reverse-image/storage";

export const SERP_CHECKPOINT_VERSION = 2 as const;

export type ReverseImageScanPhase =
  "discovering" | "discovery_complete" | "comparing" | "completed";

export interface ReverseImageLiveScanEntry {
  imageUrl: string;
  title: string;
  match: boolean;
  similarity?: number;
  at: string;
}

export interface ReverseImageSerpCheckpoint {
  version: typeof SERP_CHECKPOINT_VERSION;
  phase: ReverseImageScanPhase;
  queries: ReverseImageQueryPlan[];
  completedQueryIds: string[];
  /** Ergebnisse pro Query-Plan (Filter-Tabs). */
  resultsByQuery: Record<string, SerpImageCandidate[]>;
  /** Flache deduplizierte Liste aller Kandidaten. */
  candidates: SerpImageCandidate[];
  /** Vom Nutzer ausgewählte Bild-URLs für InsightFace. */
  selectedImageUrls: string[];
  /** Manuell hinzugefügte Links. */
  manualCandidates: SerpImageCandidate[];
  processedImageUrls: string[];
  serpFetchComplete: boolean;
  updatedAt: string;
  live?: {
    currentImageUrl: string | null;
    currentTitle: string | null;
    recent: ReverseImageLiveScanEntry[];
  };
}

/** Pro Query behalten — genug für Auswahl, ohne Speicher/Kosten zu sprengen. */
const MAX_RESULTS_PER_QUERY = Number.parseInt(
  process.env.REVERSE_IMAGE_MAX_RESULTS_PER_QUERY ?? "100",
  10
);

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

function dedupeCandidates(list: SerpImageCandidate[]): SerpImageCandidate[] {
  const seen = new Set<string>();
  const out: SerpImageCandidate[] = [];
  for (const candidate of list) {
    const key = normalizeImageUrl(candidate.imageUrl);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}

function flattenResultsByQuery(
  resultsByQuery: Record<string, SerpImageCandidate[]>
): SerpImageCandidate[] {
  return dedupeCandidates(Object.values(resultsByQuery).flat());
}

function migrateCheckpoint(raw: unknown): ReverseImageSerpCheckpoint | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<ReverseImageSerpCheckpoint> & {
    version?: number;
  };

  const version = parsed.version as number | undefined;

  if (version === 2 && Array.isArray(parsed.queries)) {
    return {
      version: SERP_CHECKPOINT_VERSION,
      phase: parsed.phase ?? "discovering",
      queries: parsed.queries,
      completedQueryIds: parsed.completedQueryIds ?? [],
      resultsByQuery: parsed.resultsByQuery ?? {},
      candidates: parsed.candidates ?? [],
      selectedImageUrls: parsed.selectedImageUrls ?? [],
      manualCandidates: parsed.manualCandidates ?? [],
      processedImageUrls: parsed.processedImageUrls ?? [],
      serpFetchComplete: Boolean(parsed.serpFetchComplete),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      live: parsed.live,
    };
  }

  if (version === 1 && Array.isArray(parsed.queries)) {
    const resultsByQuery: Record<string, SerpImageCandidate[]> = {};
    for (const candidate of parsed.candidates ?? []) {
      const queryId =
        candidate.queryId ??
        parsed.queries.find((q) => q.query === candidate.query)?.id ??
        "legacy";
      resultsByQuery[queryId] = [...(resultsByQuery[queryId] ?? []), candidate];
    }
    return {
      version: SERP_CHECKPOINT_VERSION,
      phase: parsed.serpFetchComplete ? "discovery_complete" : "discovering",
      queries: parsed.queries,
      completedQueryIds: parsed.completedQueryIds ?? [],
      resultsByQuery,
      candidates: parsed.candidates ?? [],
      selectedImageUrls: [],
      manualCandidates: [],
      processedImageUrls: parsed.processedImageUrls ?? [],
      serpFetchComplete: Boolean(parsed.serpFetchComplete),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      live: parsed.live,
    };
  }

  return null;
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

export function allCandidates(
  checkpoint: ReverseImageSerpCheckpoint
): SerpImageCandidate[] {
  return dedupeCandidates([
    ...checkpoint.candidates,
    ...checkpoint.manualCandidates,
  ]);
}

export function selectedCandidates(
  checkpoint: ReverseImageSerpCheckpoint
): SerpImageCandidate[] {
  const selected = new Set(
    checkpoint.selectedImageUrls.map((url) => normalizeImageUrl(url))
  );
  return allCandidates(checkpoint).filter((candidate) =>
    selected.has(normalizeImageUrl(candidate.imageUrl))
  );
}

export function remainingCompareCandidates(
  checkpoint: ReverseImageSerpCheckpoint
): SerpImageCandidate[] {
  return selectedCandidates(checkpoint).filter(
    (candidate) => !isCandidateProcessed(checkpoint, candidate)
  );
}

export function discoveryWorkRemaining(
  checkpoint: ReverseImageSerpCheckpoint
): boolean {
  return !checkpoint.serpFetchComplete;
}

export function compareWorkRemaining(
  checkpoint: ReverseImageSerpCheckpoint
): boolean {
  return remainingCompareCandidates(checkpoint).length > 0;
}

export async function readSerpCheckpoint(
  userId: number,
  scanId: number
): Promise<ReverseImageSerpCheckpoint | null> {
  try {
    const raw = await readFile(checkpointPath(userId, scanId), "utf8");
    return migrateCheckpoint(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function parseSerpCheckpointJson(
  json: string | null | undefined
): ReverseImageSerpCheckpoint | null {
  if (!json?.trim()) return null;
  try {
    return migrateCheckpoint(JSON.parse(json));
  } catch {
    return null;
  }
}

export async function writeSerpCheckpoint(
  userId: number,
  scanId: number,
  checkpoint: ReverseImageSerpCheckpoint,
  persistDb?: (payload: string) => Promise<void>
): Promise<void> {
  const dir = serpCacheDir(userId, scanId);
  await mkdir(dir, { recursive: true });
  const payload = JSON.stringify({
    ...checkpoint,
    updatedAt: new Date().toISOString(),
  });
  await writeFile(checkpointPath(userId, scanId), payload, "utf8");
  if (persistDb) {
    await persistDb(payload);
  }
}

export function createEmptySerpCheckpoint(
  queries: ReverseImageQueryPlan[]
): ReverseImageSerpCheckpoint {
  return {
    version: SERP_CHECKPOINT_VERSION,
    phase: "discovering",
    queries,
    completedQueryIds: [],
    resultsByQuery: {},
    candidates: [],
    selectedImageUrls: [],
    manualCandidates: [],
    processedImageUrls: [],
    serpFetchComplete: false,
    updatedAt: new Date().toISOString(),
    live: { currentImageUrl: null, currentTitle: null, recent: [] },
  };
}

export function resetCheckpointForCompare(
  checkpoint: ReverseImageSerpCheckpoint,
  selectedImageUrls: string[]
): ReverseImageSerpCheckpoint {
  return {
    ...checkpoint,
    phase: "comparing",
    selectedImageUrls,
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

export function markQueryFetched(
  checkpoint: ReverseImageSerpCheckpoint,
  plan: ReverseImageQueryPlan,
  batch: SerpImageCandidate[]
): ReverseImageSerpCheckpoint {
  const completedQueryIds = checkpoint.completedQueryIds.includes(plan.id)
    ? checkpoint.completedQueryIds
    : [...checkpoint.completedQueryIds, plan.id];

  const tagged = batch.map((candidate) => ({
    ...candidate,
    queryId: plan.id,
    queryGroup: plan.group,
    queryLabel: plan.label,
    query: plan.query,
  }));

  const perQueryCap = Number.isFinite(MAX_RESULTS_PER_QUERY)
    ? Math.max(MAX_RESULTS_PER_QUERY, 40)
    : 100;
  const mergedForQuery = dedupeCandidates([
    ...(checkpoint.resultsByQuery[plan.id] ?? []),
    ...tagged,
  ]).slice(0, perQueryCap);

  const resultsByQuery = {
    ...checkpoint.resultsByQuery,
    [plan.id]: mergedForQuery,
  };

  const candidates = flattenResultsByQuery(resultsByQuery);
  const allQueriesDone = checkpoint.queries.every((query) =>
    completedQueryIds.includes(query.id)
  );

  return {
    ...checkpoint,
    completedQueryIds,
    resultsByQuery,
    candidates,
    serpFetchComplete: allQueriesDone,
    phase: allQueriesDone ? "discovery_complete" : checkpoint.phase,
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

export function addManualCandidate(
  checkpoint: ReverseImageSerpCheckpoint,
  candidate: SerpImageCandidate
): ReverseImageSerpCheckpoint {
  const manualCandidates = dedupeCandidates([
    ...checkpoint.manualCandidates,
    candidate,
  ]);
  return {
    ...checkpoint,
    manualCandidates,
    candidates: dedupeCandidates([...checkpoint.candidates, candidate]),
  };
}

export function setSelectedImageUrls(
  checkpoint: ReverseImageSerpCheckpoint,
  urls: string[]
): ReverseImageSerpCheckpoint {
  const unique = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  return { ...checkpoint, selectedImageUrls: unique };
}

export function groupLabelsFromCheckpoint(
  checkpoint: ReverseImageSerpCheckpoint
): Array<{
  id: string;
  label: string;
  group: ReverseImageQueryGroup;
  count: number;
}> {
  return checkpoint.queries.map((plan) => ({
    id: plan.id,
    label: plan.label,
    group: plan.group,
    count: checkpoint.resultsByQuery[plan.id]?.length ?? 0,
  }));
}

export async function cleanupSerpCache(
  userId: number,
  scanId: number
): Promise<void> {
  await rm(serpCacheDir(userId, scanId), { recursive: true, force: true });
}

/** @deprecated use discoveryWorkRemaining / compareWorkRemaining */
export function scanWorkRemaining(
  checkpoint: ReverseImageSerpCheckpoint
): boolean {
  if (checkpoint.phase === "comparing") return compareWorkRemaining(checkpoint);
  if (checkpoint.phase === "discovering")
    return discoveryWorkRemaining(checkpoint);
  return false;
}

/** @deprecated use remainingCompareCandidates */
export function remainingCandidates(
  checkpoint: ReverseImageSerpCheckpoint
): SerpImageCandidate[] {
  return remainingCompareCandidates(checkpoint);
}

/** @deprecated */
export function resetCheckpointForRescan(
  checkpoint: ReverseImageSerpCheckpoint
): ReverseImageSerpCheckpoint {
  return resetCheckpointForCompare(checkpoint, checkpoint.selectedImageUrls);
}
