import { getReverseImageModuleSettings } from "@/lib/analysis/reverse-image/settings";

const DEFAULT_COMPARE_URL = "http://161.97.85.22:8000/compare";

/** Process-local KI-Last — Remote-/status liefert oft dauerhaft active_tasks=0. */
interface InsightFaceLoadState {
  inFlight: number;
  /** Peak für kurze Spikes, damit 1–2s Poll sie noch sieht */
  recentPeak: number;
  recentPeakAt: number;
}

function getLoadState(): InsightFaceLoadState {
  return ((
    globalThis as unknown as {
      __synsightInsightFaceLoad?: InsightFaceLoadState;
    }
  ).__synsightInsightFaceLoad ??= {
    inFlight: 0,
    recentPeak: 0,
    recentPeakAt: 0,
  });
}

function beginInsightFaceTask(): void {
  const state = getLoadState();
  state.inFlight += 1;
  state.recentPeak = Math.max(state.recentPeak, state.inFlight);
  state.recentPeakAt = Date.now();
}

function endInsightFaceTask(): void {
  const state = getLoadState();
  state.inFlight = Math.max(0, state.inFlight - 1);
  if (state.inFlight > 0) {
    state.recentPeak = Math.max(state.recentPeak, state.inFlight);
    state.recentPeakAt = Date.now();
  }
}

/**
 * Aktive / gerade abgeschlossene InsightFace-Tasks für den KI-Monitor-EKG.
 * Peak bleibt kurz sichtbar, damit Poll-Intervalle Spikes nicht verpassen.
 */
export function getInsightFaceActiveTasks(holdMs = 2_500): number {
  const state = getLoadState();
  const age = Date.now() - state.recentPeakAt;
  if (age >= holdMs) {
    state.recentPeak = state.inFlight;
    return state.inFlight;
  }
  return Math.max(state.inFlight, state.recentPeak);
}

export function resolveInsightFaceCompareUrl(): string {
  return (
    process.env.INSIGHTFACE_COMPARE_URL?.trim() ||
    process.env.REVERSE_IMAGE_COMPARE_URL?.trim() ||
    DEFAULT_COMPARE_URL
  );
}

export function resolveSimilarityThreshold(): number {
  const raw = Number.parseFloat(
    process.env.REVERSE_IMAGE_SIMILARITY_THRESHOLD ?? "0.35"
  );
  if (!Number.isFinite(raw)) return 0.35;
  let v = raw;
  if (v > 1 && v <= 100) v = v / 100;
  return Math.max(0.35, Math.min(0.95, v));
}

export async function resolveInsightFaceCompareUrlAsync(): Promise<string> {
  const settings = await getReverseImageModuleSettings();
  if (!settings.apiEnabled) return "";
  return settings.compareUrl.trim() || resolveInsightFaceCompareUrl();
}

export async function resolveSimilarityThresholdAsync(): Promise<number> {
  const settings = await getReverseImageModuleSettings();
  const threshold = settings.similarityThreshold;
  // Defensiv: Prozentwerte und String-Decimals abfangen
  if (threshold > 1 && threshold <= 100) return threshold / 100;
  return Math.max(0.35, Math.min(0.95, threshold));
}

export async function resolveCompareTimeoutMsAsync(): Promise<number> {
  const settings = await getReverseImageModuleSettings();
  return settings.compareTimeoutMs;
}

export function isInsightFaceConfigured(): boolean {
  return Boolean(resolveInsightFaceCompareUrl());
}

export async function isInsightFaceConfiguredAsync(): Promise<boolean> {
  const settings = await getReverseImageModuleSettings();
  if (!settings.apiEnabled) return false;
  return Boolean(await resolveInsightFaceCompareUrlAsync());
}

export interface InsightFaceCompareResult {
  similarity: number;
  latencyMs: number;
}

/** Normalisiert InsightFace-Antworten (0–1, ggf. Prozent oder distance). */
export function normalizeInsightFaceSimilarity(
  body: Record<string, unknown>
): number {
  const raw =
    body.similarity ??
    body.score ??
    body.confidence ??
    body.match_score ??
    body.sim;
  if (raw != null) {
    let n =
      typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
    if (!Number.isFinite(n)) {
      throw new Error("InsightFace lieferte keinen gültigen similarity-Wert.");
    }
    if (n > 1 && n <= 100) n = n / 100;
    return Math.max(0, Math.min(1, n));
  }
  if (body.distance != null) {
    let d =
      typeof body.distance === "number"
        ? body.distance
        : Number(String(body.distance).replace(",", "."));
    if (!Number.isFinite(d)) {
      throw new Error("InsightFace lieferte keinen gültigen distance-Wert.");
    }
    if (d > 1 && d <= 100) d = d / 100;
    return Math.max(0, Math.min(1, 1 - d));
  }
  throw new Error("InsightFace lieferte keinen similarity-/score-Wert.");
}

/**
 * Compare two image buffers via InsightFace server (multipart file1 + file2).
 */
export async function compareImagesWithInsightFace(input: {
  referenceBytes: Buffer;
  candidateBytes: Buffer;
  referenceName?: string;
  candidateName?: string;
  compareUrl?: string;
  timeoutMs?: number;
  threshold?: number;
}): Promise<InsightFaceCompareResult> {
  const url = input.compareUrl ?? (await resolveInsightFaceCompareUrlAsync());
  const timeoutMs = input.timeoutMs ?? (await resolveCompareTimeoutMsAsync());
  const form = new FormData();
  const refBlob = new Blob([new Uint8Array(input.referenceBytes)], {
    type: "image/jpeg",
  });
  const candBlob = new Blob([new Uint8Array(input.candidateBytes)], {
    type: "image/jpeg",
  });
  form.append("file1", refBlob, input.referenceName ?? "reference.jpg");
  form.append("file2", candBlob, input.candidateName ?? "candidate.jpg");

  beginInsightFaceTask();
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - started;
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      const detail =
        (typeof body.detail === "string" && body.detail) ||
        (typeof body.error === "string" && body.error) ||
        `InsightFace HTTP ${response.status}`;
      throw new Error(detail);
    }

    const similarity = normalizeInsightFaceSimilarity(body);
    return { similarity, latencyMs };
  } finally {
    endInsightFaceTask();
  }
}

export async function pingInsightFace(): Promise<boolean> {
  try {
    const url = await resolveInsightFaceCompareUrlAsync();
    if (!url) return false;
    const probe = await fetch(url.replace(/\/compare\/?$/, "/"), {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);
    if (probe?.ok) return true;
    return Boolean(url);
  } catch {
    return Boolean(await resolveInsightFaceCompareUrlAsync());
  }
}
