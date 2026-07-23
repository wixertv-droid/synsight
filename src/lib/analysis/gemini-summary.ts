import type { IntelligenceReport } from "@/lib/analysis/types";
import {
  markApiCredentialError,
  markApiCredentialSuccess,
  resolveGeminiCredentials,
} from "@/lib/services/api-credentials-service";
import { recordApiUsageEvent } from "@/lib/services/finance-service";

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

  const prompt = `Du bist ein OSINT-Analyst für SynSight. Erstelle eine kurze, professionelle Management-Zusammenfassung auf Deutsch.
Regeln:
- Nutze AUSSCHLIESSLICH die gelieferten Treffer.
- Erfinde keine URLs, Profile, Telefonnummern oder E-Mails.
- Wenn keine Treffer vorhanden sind, sage klar, dass nichts gefunden wurde.
- Maximal 180 Wörter.
- Struktur: Kurzer Befund, Hauptrisiken, empfohlene nächste Schritte.

Daten:
${JSON.stringify(payload)}`;

  const models = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
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
              maxOutputTokens: 500,
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
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
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
          },
        });
        return text;
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
