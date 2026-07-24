import type { IntelligenceHit } from "@/lib/analysis/types";
import {
  buildSourceLinks,
  formatSourceMarkdown,
  linkifySummaryText,
} from "@/lib/analysis/osint/source-link-builder";
import { aggregateByOsintCategory } from "@/lib/analysis/osint/result-classifier";
import { VERIFIED_CONFIDENCE_MIN } from "@/lib/analysis/osint/result-verifier";

export interface GeminiHitPayload {
  title: string;
  url: string;
  snippet: string;
  category: string;
  risk: string;
  source: string;
  confidence: number;
  confidenceLabel: string;
  severity: string;
}

/**
 * GeminiSummaryBuilder — Prompt + Payload nur aus verifizierten Treffern (>=70).
 */
export function buildVerifiedGeminiPayload(
  subjectName: string,
  riskLevel: string,
  hits: IntelligenceHit[]
): {
  verifiedHits: IntelligenceHit[];
  payload: {
    subject: string;
    riskLevel: string;
    hitCount: number;
    categories: Array<{
      label: string;
      count: number;
      avgConfidence: number;
      riskLevel: string;
    }>;
    sources: Array<{ platform: string; url: string; title: string }>;
    hits: GeminiHitPayload[];
  };
  prompt: string;
} {
  const verifiedHits = hits.filter(
    (hit) =>
      hit.sourceType === "serpapi_google" &&
      (hit.identityConfidence ?? 0) >= VERIFIED_CONFIDENCE_MIN
  );

  const categories = aggregateByOsintCategory(verifiedHits).map((item) => ({
    label: item.label,
    count: item.count,
    avgConfidence: item.avgConfidence,
    riskLevel: item.riskLevel,
  }));

  const sources = buildSourceLinks(verifiedHits).map((link) => ({
    platform: link.platform,
    url: link.url,
    title: link.title,
  }));

  const payloadHits: GeminiHitPayload[] = verifiedHits
    .slice(0, 40)
    .map((hit) => ({
      title: hit.title,
      url: hit.url,
      snippet: hit.snippet,
      category: hit.displayCategory ?? hit.category,
      risk: hit.risk,
      source: hit.source,
      confidence: hit.identityConfidence ?? 0,
      confidenceLabel: hit.identityConfidenceLabel ?? "",
      severity: hit.severity ?? "low",
    }));

  const sourceBlock = formatSourceMarkdown(buildSourceLinks(verifiedHits));

  const prompt = `Du bist ein OSINT-Sicherheitsanalyst für Privatpersonen. Erstelle ein strukturiertes KI-Lagebild auf Deutsch.

HARTE REGELN:
- Nutze AUSSCHLIESSLICH die gelieferten verifizierten Treffer (Confidence >= ${VERIFIED_CONFIDENCE_MIN} %).
- Erfinde keine Profile, URLs, Plattformen, Telefonnummern oder E-Mails.
- Jede genannte Plattform/Quelle MUSS mit einer echten URL aus den Daten belegt sein.
- Schreibe Plattformnamen als Markdown-Links: [Plattform](https://…).
- Keine Vermutungen, keine Halluzinationen, keine „könnte“-Behauptungen ohne Treffer.
- Wenn keine Treffer: klar sagen, dass keine verifizierten Spuren gefunden wurden.

AUSGABESTRUKTUR (genau diese 7 Abschnitte, mit Überschriften):

1. Management-Zusammenfassung
(maximal 8 Zeilen Fließtext)

2. Identifizierte digitale Spuren
Gruppiert nach Kategorien aus den Daten. Jede Kategorie mit Anzahl. Quellen als Markdown-Links.

3. Bestätigte öffentliche Profile
Nur Profile mit Link. Format: - [Plattform](URL) — Kurzbeschreibung

4. Öffentliche Erwähnungen
Foren/Presse/Web mit Link. Format wie oben.

5. Mögliche Risiken
Ampel: Grün / Gelb / Rot — jeweils 1–3 Stichpunkte, nur belegt.

6. Empfohlene Maßnahmen
Priorität Hoch:
Priorität Mittel:
Priorität Niedrig:

7. Nicht eindeutig bestätigte Treffer
Nur wenn in den Daten keine weiteren vorhanden sind: „Keine.“
(Hinweis: Unsichere Treffer unter 70 % werden dem Modell bewusst NICHT übergeben.)

BEKANNTE QUELLEN (zum Verlinken nutzen):
${sourceBlock}

DATEN (JSON):
${JSON.stringify({
  subject: subjectName,
  riskLevel,
  hitCount: verifiedHits.length,
  categories,
  sources,
  hits: payloadHits,
})}`;

  return {
    verifiedHits,
    payload: {
      subject: subjectName,
      riskLevel,
      hitCount: verifiedHits.length,
      categories,
      sources,
      hits: payloadHits,
    },
    prompt,
  };
}

export function postProcessGeminiSummary(
  raw: string,
  hits: IntelligenceHit[]
): string {
  const links = buildSourceLinks(
    hits.filter(
      (hit) =>
        hit.sourceType === "serpapi_google" &&
        (hit.identityConfidence ?? 0) >= VERIFIED_CONFIDENCE_MIN
    )
  );
  return linkifySummaryText(raw.trim(), links);
}
