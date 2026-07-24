import type { IntelligenceHit } from "@/lib/analysis/types";
import {
  buildSourceLinks,
  formatSourceMarkdown,
  linkifySummaryText,
} from "@/lib/analysis/osint/source-link-builder";
import { aggregateByOsintCategory } from "@/lib/analysis/osint/result-classifier";
import { VERIFIED_CONFIDENCE_MIN } from "@/lib/analysis/osint/result-verifier";
import type { AggregatedProfile } from "@/lib/analysis/osint/profile-aggregator";
import type { ThreatMatrix } from "@/lib/analysis/osint/threat-evaluator";
import { detectSensitiveCategories } from "@/lib/analysis/osint/threat-evaluator";

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
  checks?: Array<{ label: string; found: boolean }>;
  pageCount?: number;
}

/**
 * GeminiSummaryBuilder — Fakten-only Senior OSINT Analyst Prompt.
 */
export function buildVerifiedGeminiPayload(
  subjectName: string,
  riskLevel: string,
  hits: IntelligenceHit[],
  options?: {
    profiles?: AggregatedProfile[];
    threatMatrix?: ThreatMatrix | null;
    fingerprintHash?: string;
  }
): {
  verifiedHits: IntelligenceHit[];
  payload: Record<string, unknown>;
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

  const sensitive = detectSensitiveCategories(verifiedHits);
  const hasPublicEmail = verifiedHits.some((h) =>
    /@|e-?mail/i.test(`${h.title} ${h.snippet}`)
  );
  const hasPublicPhone = verifiedHits.some((h) =>
    /\+?\d[\d\s/-]{6,}|telefon/i.test(`${h.title} ${h.snippet}`)
  );
  const hasPublicAddress = verifiedHits.some((h) =>
    /straße|strasse|plz|\b\d{5}\b|adresse/i.test(`${h.title} ${h.snippet}`)
  );

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
      checks: hit.confidenceChecks,
      pageCount: hit.pageCount,
    }));

  const profiles = (options?.profiles ?? [])
    .filter((p) => p.maxConfidence >= VERIFIED_CONFIDENCE_MIN)
    .map((p) => ({
      platform: p.platform,
      host: p.host,
      url: p.url,
      pageCount: p.pageCount,
      category: p.category,
      confidence: p.maxConfidence,
    }));

  const sourceBlock = formatSourceMarkdown(buildSourceLinks(verifiedHits));

  const payload = {
    subject: subjectName,
    riskLevel,
    fingerprintHash: options?.fingerprintHash ?? null,
    hitCount: verifiedHits.length,
    categories,
    profiles,
    sensitiveFindings: sensitive,
    publicContact: {
      email: hasPublicEmail,
      phone: hasPublicPhone,
      address: hasPublicAddress,
    },
    threatMatrix: options?.threatMatrix ?? null,
    sources,
    hits: payloadHits,
  };

  const prompt = `Du bist Senior OSINT Intelligence Analyst eines Cyber Security Unternehmens.

Du schreibst einen professionellen Intelligence Report.
Du beschreibst ausschließlich nachweisbare Fakten.
Du erfindest nichts. Du ergänzt nichts. Du interpretierst nichts.
Du bewertest keine Moral. Du beschönigst keine Ergebnisse.
Du verschweigst keine kompromittierenden Inhalte.
Du formulierst präzise, sachlich und professionell.
Jede Aussage muss direkt aus den gelieferten Daten ableitbar sein.
Wenn Daten fehlen, schreibe ausdrücklich, dass hierzu keine öffentlichen Informationen gefunden wurden.
Schreibe wie ein Ermittlungs- oder Intelligence-Bericht.
Nicht wie Werbung. Nicht wie ChatGPT. Nicht wie ein Blogartikel.

VERBOTENE FORMULIERUNGEN (außer sie stehen wörtlich in den Daten):
vermutlich, könnte, wahrscheinlich, scheint, möglicherweise, eventuell, man kann annehmen.

Wenn in den Daten Pornografie, Datingportale, Escort, Leaks, Betrug, Inkasso, beleidigende Foren oder ähnliche Inhalte belegt sind: klar benennen. Nicht relativieren. Nicht entschuldigen.

Plattformnamen als Markdown-Links schreiben: [Plattform](https://…).
Jede wichtige Aussage braucht mindestens eine Quelle aus den Daten.

AUSGABESTRUKTUR (genau diese Abschnitte):

1. Digitales Kurzprofil
Nur die öffentlich auffindbare digitale Identität. Keine Aussagen über Charakter, Persönlichkeit, Politik, Religion oder private Beziehungen. Keine psychologischen Einschätzungen.

2. Management-Zusammenfassung
Maximal 8 Zeilen. Enthalten:
- Anzahl relevanter Treffer
- Aufschlüsselung nach Kategorien (Profile, Foren, Dokumente, …)
- Öffentliche Telefonnummer: Ja/Nein
- Öffentliche Mail: Ja/Nein
- Öffentliche Anschrift: Ja/Nein

3. Öffentliche Profile
Aggregierte Profile mit Link. Format: - [Plattform](URL) — Fakten (Seitenzahl falls vorhanden)

4. Öffentliche Erwähnungen
Foren/Presse/Web mit Link.

5. Erkannte Risiken
Nur belegte Risiken. Nutze die threatMatrix-Werte und sensitiveFindings. Ampel optional, aber faktenbasiert.

6. Handlungsempfehlungen
Konkret, auf einzelne Quellen bezogen. Nicht „Profil entfernen.“ sondern warum und was genau.

7. Quellenübersicht
Vollständige Liste klickbarer Quellen.

BEKANNTE QUELLEN:
${sourceBlock}

DATEN (JSON — einzige erlaubte Faktenbasis):
${JSON.stringify(payload)}`;

  return { verifiedHits, payload, prompt };
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
