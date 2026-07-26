import {
  isCompleteAiSummary,
  sanitizeAiSummary,
} from "@/lib/analysis/ai-summary-text";
import {
  GEMINI_OSINT_SAFETY_SETTINGS,
  GEMINI_SAFETY_FALLBACK_MESSAGE,
  isGeminiSafetyBlock,
} from "@/lib/analysis/gemini-safety";
import type { PlatformThreat } from "@/lib/dashboard/build-threats-from-reports";
import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGeminiCredentials,
} from "@/lib/services/api-credentials-service";
import {
  recordApiUsageEvent,
  type ApiTokenUsage,
} from "@/lib/services/finance-service";

export interface ThreatsGeminiPayload {
  mode: "facts_only";
  threatCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  modules: string[];
  threats: Array<{
    id: string;
    level: string;
    module: string;
    title: string;
    found: string;
    whyItMatters: string;
    userAction: string;
    source: string;
  }>;
}

export function buildThreatsGeminiPayload(
  threats: PlatformThreat[]
): ThreatsGeminiPayload {
  return {
    mode: "facts_only",
    threatCount: threats.length,
    highCount: threats.filter((t) => t.level === "high").length,
    mediumCount: threats.filter((t) => t.level === "medium").length,
    lowCount: threats.filter((t) => t.level === "low").length,
    modules: [...new Set(threats.map((t) => t.moduleKey))],
    threats: threats.map((t) => ({
      id: t.id,
      level: t.level,
      module: t.moduleLabel,
      title: t.title,
      found: t.found,
      whyItMatters: t.whyItMatters,
      userAction: t.userAction,
      source: t.source,
    })),
  };
}

function buildPrompt(payload: ThreatsGeminiPayload): string {
  return `Du bist LAGEANALYST eines Cyber-Security-Unternehmens (OSINT / Exposure).

NICHT Assistent. NICHT freundlich. NICHT beschönigend. NICHT dramatisierend.
Du legst die Fakten ungeschönt auf den Tisch — knapp, klar, priorisiert.
Du erfindest nichts. Du ergänzt nichts, was nicht in den Daten steht.

AUSGABESTRUKTUR (genau diese Abschnitte, Deutsch):

1. Lagebild
2–4 Sätze: Gesamtrisiko aus den gelieferten Bedrohungen (Anzahl Hoch/Mittel/Niedrig, betroffene Module).

2. Kritische Punkte
Aufzählung der wichtigsten Fakten (nur aus threats[]). Keine Floskeln.

3. Sofortmaßnahmen
Konkrete nächste Schritte aus userAction — priorisiert, ohne Standardphrasen.

4. Offene Risiken
Was weiterhin ungeklärt oder nur mittel priorisiert bleibt.

VERBOTEN: vermutlich, könnte, scheint, möglicherweise — außer wörtlich in den Daten.
Keine neuen Bedrohungen erfinden.

DATEN (JSON — einzige Faktenbasis):
${JSON.stringify(payload)}`;
}

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface GeminiCandidate {
  finishReason?: string;
  content?: { parts?: Array<{ text?: string; thought?: boolean }> };
}

interface GeminiGenerateResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: GeminiUsageMetadata;
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
  const config: Record<string, unknown> = { maxOutputTokens: 4096 };
  if (isGemini3) {
    config.thinkingConfig = { thinkingLevel: "minimal" };
  } else {
    config.temperature = 0.15;
  }
  return config;
}

export async function summarizeThreatsWithGemini(
  threats: PlatformThreat[],
  options?: { userId?: number | null }
): Promise<{ text: string | null; model: string | null }> {
  if (threats.length === 0) {
    return {
      text: "Keine priorisierten Bedrohungen aus den vorliegenden Analysen.",
      model: null,
    };
  }

  const credentials = await resolveGeminiCredentials();
  if (!credentials) return { text: null, model: null };

  const payload = buildThreatsGeminiPayload(threats);
  const prompt = buildPrompt(payload);
  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  let lastError = "gemini failed";
  let bestPartial: string | null = null;
  let usedModel: string | null = null;
  let accumulatedUsage: ApiTokenUsage | null = null;
  let safetyBlocked = false;

  for (const model of models) {
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
      const usage = parseUsageMetadata(body.usageMetadata);
      if (usage) {
        accumulatedUsage = accumulatedUsage
          ? {
              promptTokenCount:
                accumulatedUsage.promptTokenCount + usage.promptTokenCount,
              candidatesTokenCount:
                accumulatedUsage.candidatesTokenCount +
                usage.candidatesTokenCount,
              totalTokenCount:
                (accumulatedUsage.totalTokenCount ?? 0) +
                (usage.totalTokenCount ?? 0),
            }
          : usage;
      }
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
        lastError = "safety block";
        continue;
      }
      const raw = extractCandidateText(candidate);
      const cleaned = sanitizeAiSummary(raw);
      if (cleaned && isCompleteAiSummary(cleaned)) {
        usedModel = model;
        await markApiCredentialSuccess("gemini");
        if (accumulatedUsage && options?.userId) {
          await recordApiUsageEvent({
            providerCode: "gemini",
            eventType: "threats_summary",
            referenceKey: `threats:${options.userId}`,
            userId: options.userId,
            success: true,
            detail: `threats=${threats.length} model=${model}`,
            tokenUsage: accumulatedUsage,
          });
        }
        return { text: cleaned, model };
      }
      if (cleaned && cleaned.length > (bestPartial?.length ?? 0)) {
        bestPartial = cleaned;
        usedModel = model;
      }
      lastError = "incomplete summary";
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed";
    }
  }

  if (safetyBlocked) {
    return { text: GEMINI_SAFETY_FALLBACK_MESSAGE, model: usedModel };
  }

  await markApiCredentialError("gemini", lastError.slice(0, 240));
  if (bestPartial) return { text: bestPartial, model: usedModel };
  return { text: null, model: usedModel };
}
