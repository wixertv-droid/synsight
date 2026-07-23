import type { IntelligenceReport } from "@/lib/analysis/types";
import {
  isCompleteAiSummary,
  sanitizeAiSummary,
} from "@/lib/analysis/ai-summary-text";
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

function extractCandidateText(
  candidate:
    | {
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }
    | undefined
): string {
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
    // Thinking + Antwort teilen sich das Limit — großzügig bemessen.
    maxOutputTokens: 8192,
  };
  if (isGemini3) {
    // Default „medium“ Thinking frisst oft das sichtbare Lagebild weg.
    config.thinkingConfig = { thinkingLevel: "minimal" };
  } else {
    config.temperature = 0.25;
  }
  return config;
}

/**
 * Optional Gemini summary — only summarizes verified hits.
 * Never invents findings. Returns null if API is unavailable.
 * Credentials: Admin DB first, then env GEMINI_API_KEY.
 * Costs: usageMetadata tokens × Admin Finanzen Token-Preise.
 */
export async function summarizeWithGemini(
  report: Pick<
    IntelligenceReport,
    "subjectName" | "hits" | "summaryText" | "riskLevel" | "executive"
  >
): Promise<string | null> {
  const credentials = await resolveGeminiCredentials();
  if (!credentials) return null;

  const verified = (report.hits ?? []).filter(
    (hit) => hit.sourceType === "serpapi_google"
  );

  const payload = {
    subject: report.subjectName,
    riskLevel: report.riskLevel,
    hitCount: verified.length,
    hits: verified.slice(0, 40).map((hit) => ({
      title: hit.title,
      url: hit.url,
      snippet: hit.snippet,
      category: hit.category,
      risk: hit.risk,
      source: hit.source,
    })),
  };

  const prompt = `Du bist ein Sicherheitsberater für Privatpersonen. Schreibe ein VOLLSTÄNDIGES KI-Lagebild auf Deutsch.

HARTE REGELN:
- Nutze AUSSCHLIESSLICH die gelieferten Treffer. Erfinde nichts.
- KEINE Überschriften, KEINE Labels. Verboten u. a.: „Management-Zusammenfassung“, „Befund“, „Lagebild“, „Empfehlung“, „Executive Summary“, Markdown, Sternchen.
- Schreibe genau 3 Absätze, getrennt durch eine Leerzeile:
  Absatz 1: Was wurde gefunden? (konkret, in ganzen Sätzen)
  Absatz 2: Was bedeutet das für die Person?
  Absatz 3: Was sollte als Nächstes getan werden?
- 180–320 Wörter insgesamt. Jeder Absatz endet mit einem vollständigen Satz (. ! oder ?).
- Niemals mitten im Wort oder Satz abbrechen. Wenn der Platz knapp wird: kürzer formulieren, aber fertig schreiben.
- Wenn keine Treffer: klar sagen, dass nichts Relevantes gefunden wurde (trotzdem 3 kurze Absätze).

Daten:
${JSON.stringify(payload)}`;

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
          }),
        }
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = `HTTP ${response.status}: ${detail.slice(0, 200)}`;
        continue;
      }
      const body = (await response.json()) as {
        candidates?: Array<{
          finishReason?: string;
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
        }>;
        usageMetadata?: GeminiUsageMetadata;
      };
      accumulatedUsage = mergeTokenUsage(
        accumulatedUsage,
        parseUsageMetadata(body.usageMetadata)
      );
      const candidate = body.candidates?.[0];
      const text = extractCandidateText(candidate);
      if (!text) {
        lastError = "empty candidate text";
        continue;
      }

      const sanitized = sanitizeAiSummary(text);
      const finishReason = candidate?.finishReason ?? null;
      const truncatedByLimit =
        finishReason === "MAX_TOKENS" || finishReason === "LENGTH";
      const complete = isCompleteAiSummary(sanitized);

      if (sanitized.length > (bestPartial?.length ?? 0)) {
        bestPartial = sanitized;
      }

      // Unvollständige Antworten verwerfen und nächstes Modell versuchen.
      if (truncatedByLimit || !complete) {
        lastError = truncatedByLimit
          ? `MAX_TOKENS truncation (${sanitized.length} chars)`
          : `incomplete summary (${sanitized.length} chars)`;
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
          ? `KI-Lagebild · ${report.subjectName} · ${model} · ${tokens.promptTokenCount} in / ${tokens.candidatesTokenCount} out Tokens`
          : `KI-Lagebild · ${report.subjectName} · Modell ${model}`,
        tokenUsage: tokens,
        metaJson: {
          model,
          attempts,
          hitCount: verified.length,
          subjectName: report.subjectName,
          finishReason,
          charCount: sanitized.length,
        },
      });
      return sanitized;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "gemini failed";
    }
  }

  // Letzter Fallback: längstes brauchbares Fragment nur wenn es schon wie Text wirkt.
  if (bestPartial && bestPartial.length >= 160) {
    const fallback = sanitizeAiSummary(bestPartial);
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
