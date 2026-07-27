import { getReverseImageModuleSettings } from "@/lib/analysis/reverse-image/settings";

const DEFAULT_COMPARE_URL = "http://161.97.85.22:8000/compare";

export function resolveInsightFaceCompareUrl(): string {
  return (
    process.env.INSIGHTFACE_COMPARE_URL?.trim() ||
    process.env.REVERSE_IMAGE_COMPARE_URL?.trim() ||
    DEFAULT_COMPARE_URL
  );
}

export function resolveSimilarityThreshold(): number {
  const raw = Number.parseFloat(
    process.env.REVERSE_IMAGE_SIMILARITY_THRESHOLD ?? "0.6"
  );
  if (!Number.isFinite(raw)) return 0.6;
  return Math.max(0.35, Math.min(0.95, raw));
}

export async function resolveInsightFaceCompareUrlAsync(): Promise<string> {
  const settings = await getReverseImageModuleSettings();
  if (!settings.apiEnabled) return "";
  return settings.compareUrl.trim() || resolveInsightFaceCompareUrl();
}

export async function resolveSimilarityThresholdAsync(): Promise<number> {
  const settings = await getReverseImageModuleSettings();
  return settings.similarityThreshold;
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

  const started = Date.now();
  const response = await fetch(url, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const latencyMs = Date.now() - started;
  const body = (await response.json().catch(() => ({}))) as {
    similarity?: number;
    detail?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      body.detail || body.error || `InsightFace HTTP ${response.status}`
    );
  }

  const similarity = Number(body.similarity);
  if (!Number.isFinite(similarity)) {
    throw new Error("InsightFace lieferte keinen gültigen similarity-Wert.");
  }

  return { similarity, latencyMs };
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
