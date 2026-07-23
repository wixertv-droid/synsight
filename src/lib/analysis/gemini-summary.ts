import type { IntelligenceReport } from "@/lib/analysis/types";
import { sanitizeAiSummary } from "@/lib/analysis/ai-summary-text";
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

  const prompt = `Du bist ein Sicherheitsberater für Privatpersonen. Schreibe ein vollständiges KI-Lagebild auf Deutsch.

Regeln:
- Nutze AUSSCHLIESSLICH die gelieferten Treffer.
- Erfinde keine URLs, Profile, Telefonnummern oder E-Mails.
- Kein Markdown, keine Sternchen (**), keine Überschriften wie „Management-Zusammenfassung“.
- Schreibe so, dass Laien sofort verstehen, was gemeint ist.
- 180–280 Wörter, genau 3 Absätze mit Leerzeile dazwischen:
  1) Was wurde gefunden?
  2) Was bedeutet das für die Person?
  3) Was sollte als Nächstes getan werden?
- Wenn keine Treffer vorhanden sind, sage klar, dass nichts Relevantes gefunden wurde.
- Jeder Absatz muss mit einem vollständigen Satz enden. Niemals mitten im Wort abbrechen.

Daten:
${JSON.stringify(payload)}`;

  const models = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];
  let lastError = "gemini failed";
  let attempts = 0;
  let accumulatedUsage: ApiTokenUsage | null = null;

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
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 4096,
            },
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
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: GeminiUsageMetadata;
      };
      accumulatedUsage = mergeTokenUsage(
        accumulatedUsage,
        parseUsageMetadata(body.usageMetadata)
      );
      const candidate = body.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text?.trim();
      if (text) {
        const sanitized = sanitizeAiSummary(text);
        if (candidate?.finishReason === "MAX_TOKENS" && sanitized.length < 80) {
          lastError = "MAX_TOKENS truncation";
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
            finishReason: candidate?.finishReason ?? null,
          },
        });
        return sanitized;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "gemini failed";
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
