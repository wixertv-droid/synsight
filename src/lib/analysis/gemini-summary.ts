import type { IntelligenceReport } from "@/lib/analysis/types";

/**
 * Optional Gemini summary — only summarizes verified hits.
 * Never invents findings. Returns null if API is unavailable.
 */
export async function summarizeWithGemini(
  report: Pick<
    IntelligenceReport,
    "subjectName" | "hits" | "summaryText" | "riskLevel" | "executive"
  >
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const verified = report.hits.filter(
    (hit) => hit.sourceType === "google_custom_search"
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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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

    if (!response.ok) return null;
    const body = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}
