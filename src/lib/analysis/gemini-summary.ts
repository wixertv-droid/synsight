import type { IntelligenceReport } from "@/lib/analysis/types";
import { sanitizeAiSummary } from "@/lib/analysis/ai-summary-text";
import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGeminiCredentials,
} from "@/lib/services/api-credentials-service";
import { recordApiUsageEvent } from "@/lib/services/finance-service";

export { sanitizeAiSummary } from "@/lib/analysis/ai-summary-text";

/**
 * Optional Gemini summary — only summarizes verified hits.
 * Never invents findings. Returns null if API is unavailable.
 * Credentials: Admin DB first, then env GEMINI_API_KEY.
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

  const prompt = `Du bist ein Sicherheitsberater für Privatpersonen. Schreibe ein kurzes KI-Lagebild auf Deutsch.

Regeln:
- Nutze AUSSCHLIESSLICH die gelieferten Treffer.
- Erfinde keine URLs, Profile, Telefonnummern oder E-Mails.
- Kein Markdown, keine Sternchen, keine Aufzählungszeichen mit **.
- Schreibe so, dass Laien sofort verstehen, was gemeint ist.
- Maximal 120 Wörter, 3 kurze Absätze:
  1) Was wurde gefunden?
  2) Was bedeutet das für die Person?
  3) Was sollte als Nächstes getan werden?
- Wenn keine Treffer vorhanden sind, sage klar, dass nichts Relevantes gefunden wurde.
- Beende jeden Absatz mit einem vollständigen Satz.

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
              temperature: 0.2,
              maxOutputTokens: 2048,
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
      };
      const candidate = body.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text?.trim();
      if (text) {
        const sanitized = sanitizeAiSummary(text);
        if (candidate?.finishReason === "MAX_TOKENS" && sanitized.length < 80) {
          lastError = "MAX_TOKENS truncation";
          continue;
        }
        await markApiCredentialSuccess("gemini");
        await recordApiUsageEvent({
          providerCode: "gemini",
          eventType: "summarize",
          referenceKey: `gemini:${report.subjectName}:${Date.now()}`,
          requestCount: attempts,
          success: true,
          detail: `KI-Lagebild · ${report.subjectName} · Modell ${model}`,
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
    metaJson: { attempts, subjectName: report.subjectName },
  });
  return null;
}
