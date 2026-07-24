import type { IntelligenceReport } from "@/lib/analysis/types";
import {
  isCompleteAiSummary,
  sanitizeAiSummary,
} from "@/lib/analysis/ai-summary-text";
import {
  buildVerifiedGeminiPayload,
  postProcessGeminiSummary,
} from "@/lib/analysis/osint/gemini-summary-builder";
import {
  GEMINI_OSINT_SAFETY_SETTINGS,
  GEMINI_SAFETY_FALLBACK_MESSAGE,
  isGeminiSafetyBlock,
} from "@/lib/analysis/gemini-safety";
import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGeminiCredentials,
} from "@/lib/services/api-credentials-service";
import {
  recordApiUsageEvent,
  type ApiTokenUsage,
} from "@/lib/services/finance-service";

export { sanitizeAiSummary } from "@/lib/analysis/ai-summary-text";

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
}

interface GeminiCandidate {
  finishReason?: string;
  content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  safetyRatings?: Array<{ category?: string; probability?: string }>;
}

interface GeminiGenerateResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{ category?: string; probability?: string }>;
  };
  usageMetadata?: GeminiUsageMetadata;
  error?: { message?: string; status?: string };
}

function parseUsageMetadata(raw: unknown): ApiTokenUsage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const meta = raw as GeminiUsageMetadata;
  const prompt = Number(meta.promptTokenCount) || 0;
  const candidates = Number(meta.candidatesTokenCount) || 0;
  const total =
    Number(meta.totalTokenCount) ||
    (prompt > 0 || candidates > 0 ? prompt + candidates : 0);
  if (prompt <= 0 && candidates <= 0 && total <= 0) return null;
  return {
    promptTokenCount: prompt,
    candidatesTokenCount: candidates,
    totalTokenCount: total,
  };
}

function mergeTokenUsage(
  current: ApiTokenUsage | null,
  next: ApiTokenUsage | null
): ApiTokenUsage | null {
  if (!next) return current;
  if (!current) return next;
  return {
    promptTokenCount: current.promptTokenCount + next.promptTokenCount,
    candidatesTokenCount:
      current.candidatesTokenCount + next.candidatesTokenCount,
    totalTokenCount:
      (current.totalTokenCount ?? 0) + (next.totalTokenCount ?? 0),
  };
}

function extractCandidateText(candidate: GeminiCandidate | undefined): string {
  const parts = candidate?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text!.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function generationConfigForModel(model: string): Record<string, unknown> {
  const isGemini3 = /gemini-3/i.test(model);
  const config: Record<string, unknown> = {
    maxOutputTokens: 8192,
  };
  if (isGemini3) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  } else {
    config.temperature = 0.2;
  }
  return config;
}

/**
 * Gemini KI-Lagebild — Top-ranked Treffer, Safety BLOCK_NONE für OSINT.
 */
export async function summarizeWithGemini(
  report: Pick<
    IntelligenceReport,
    | "subjectName"
    | "hits"
    | "summaryText"
    | "riskLevel"
    | "executive"
    | "fingerprintHash"
    | "threatMatrix"
  >
): Promise<string | null> {
  const credentials = await resolveGeminiCredentials();
  if (!credentials) return null;

  const { verifiedHits, prompt } = buildVerifiedGeminiPayload(
    report.subjectName,
    report.riskLevel,
    report.hits ?? [],
    {
      fingerprintHash: report.fingerprintHash ?? undefined,
      threatMatrix: report.threatMatrix ?? undefined,
    }
  );

  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];
  let lastError = "gemini failed";
  let attempts = 0;
  let accumulatedUsage: ApiTokenUsage | null = null;
  let bestPartial: string | null = null;
  let safetyBlocked = false;

  for (const model of models) {
    attempts += 1;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(credentials.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: generationConfigForModel(model),
            safetySettings: GEMINI_OSINT_SAFETY_SETTINGS,
          }),
        }
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = `HTTP ${response.status}: ${detail.slice(0, 200)}`;
        continue;
      }
      const body = (await response.json()) as GeminiGenerateResponse;
      accumulatedUsage = mergeTokenUsage(
        accumulatedUsage,
        parseUsageMetadata(body.usageMetadata)
      );
      const candidate = body.candidates?.[0];
      const finishReason = candidate?.finishReason ?? null;
      const promptBlock = body.promptFeedback?.blockReason ?? null;

      if (
        isGeminiSafetyBlock({
          finishReason,
          blockReason: promptBlock,
          promptBlockReason: promptBlock,
        })
      ) {
        safetyBlocked = true;
        lastError = `SAFETY block (${model}): finishReason=${finishReason ?? "n/a"} blockReason=${promptBlock ?? "n/a"}`;
        // Try next model — some tolerate adult/leak content better.
        continue;
      }

      const text = extractCandidateText(candidate);
      if (!text) {
        lastError = "empty candidate text";
        continue;
      }

      const sanitized = sanitizeAiSummary(text);
      const linked = postProcessGeminiSummary(sanitized, verifiedHits);
      const truncatedByLimit =
        finishReason === "MAX_TOKENS" || finishReason === "LENGTH";
      // Structured OSINT summary: accept if long enough and not hard-truncated.
      const complete =
        !truncatedByLimit &&
        (isCompleteAiSummary(linked) ||
          (linked.length >= 200 &&
            /Management-Zusammenfassung|Digitales Kurzprofil|Quellenübersicht|Handlungsempfehlungen/i.test(
              linked
            )));

      if (linked.length > (bestPartial?.length ?? 0)) {
        bestPartial = linked;
      }

      if (!complete) {
        lastError = truncatedByLimit
          ? `MAX_TOKENS truncation (${linked.length} chars)`
          : `incomplete summary (${linked.length} chars)`;
        continue;
      }

      await markApiCredentialSuccess("gemini");
      const tokens = accumulatedUsage;
      await recordApiUsageEvent({
        providerCode: "gemini",
        eventType: "summarize",
        referenceKey: `gemini:${report.subjectName}:${Date.now()}`,
        requestCount: attempts,
        success: true,
        detail: tokens
          ? `KI-Lagebild · ${report.subjectName} · ${model} · ${tokens.promptTokenCount} in / ${tokens.candidatesTokenCount} out · ${verifiedHits.length} hits`
          : `KI-Lagebild · ${report.subjectName} · ${model}`,
        tokenUsage: tokens,
        metaJson: {
          model,
          attempts,
          verifiedHitCount: verifiedHits.length,
          subjectName: report.subjectName,
          finishReason,
          charCount: linked.length,
          safetySettings: "BLOCK_NONE",
        },
      });
      return linked;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "gemini failed";
    }
  }

  if (bestPartial && bestPartial.length >= 160) {
    const fallback = postProcessGeminiSummary(
      sanitizeAiSummary(bestPartial),
      verifiedHits
    );
    if (fallback.length >= 120) {
      await markApiCredentialSuccess("gemini");
      await recordApiUsageEvent({
        providerCode: "gemini",
        eventType: "summarize_partial",
        referenceKey: `gemini-partial:${report.subjectName}:${Date.now()}`,
        requestCount: Math.max(1, attempts),
        success: true,
        detail: `KI-Lagebild (Teilantwort) · ${report.subjectName}`,
        tokenUsage: accumulatedUsage,
        metaJson: {
          attempts,
          subjectName: report.subjectName,
          charCount: fallback.length,
          lastError,
        },
      });
      return fallback;
    }
  }

  if (safetyBlocked) {
    await markApiCredentialSuccess("gemini");
    await recordApiUsageEvent({
      providerCode: "gemini",
      eventType: "summarize_safety_fallback",
      referenceKey: `gemini-safety:${report.subjectName}:${Date.now()}`,
      requestCount: Math.max(1, attempts),
      success: true,
      detail: `KI-Lagebild Safety-Fallback · ${report.subjectName}`,
      tokenUsage: accumulatedUsage,
      metaJson: {
        attempts,
        subjectName: report.subjectName,
        lastError,
        safetySettings: "BLOCK_NONE",
      },
    });
    return postProcessGeminiSummary(
      GEMINI_SAFETY_FALLBACK_MESSAGE,
      verifiedHits
    );
  }

  await markApiCredentialError("gemini", lastError);
  await recordApiUsageEvent({
    providerCode: "gemini",
    eventType: "summarize_error",
    referenceKey: `gemini-error:${Date.now()}`,
    requestCount: Math.max(1, attempts),
    success: false,
    detail: lastError.slice(0, 500),
    tokenUsage: accumulatedUsage,
    metaJson: {
      attempts,
      subjectName: report.subjectName,
      usageMetadata: accumulatedUsage,
    },
  });
  return null;
}
