import type { IntelligenceHit } from "@/lib/analysis/types";
import { isLiveIntelSource } from "@/lib/analysis/types";
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
import type { DehashedLeakDetail } from "@/lib/analysis/osint/dehashed-provider";

const GEMINI_TOP_HIT_LIMIT = 30;
const GEMINI_PROFILE_MIN = 50;

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
    dehashedLeaks?: DehashedLeakDetail[];
  }
): {
  verifiedHits: IntelligenceHit[];
  payload: Record<string, unknown>;
  prompt: string;
} {
  // Top 25–30 höchst gerankte Treffer — SERP + DeHashed Leaks
  const rankedHits = hits
    .filter((hit) => isLiveIntelSource(hit.sourceType))
    .sort((a, b) => (b.identityConfidence ?? 0) - (a.identityConfidence ?? 0));
  const high = rankedHits.filter(
    (hit) => (hit.identityConfidence ?? 0) >= VERIFIED_CONFIDENCE_MIN
  );
  const medium = rankedHits.filter((hit) => {
    const score = hit.identityConfidence ?? 0;
    return score >= 50 && score < VERIFIED_CONFIDENCE_MIN;
  });
  const lowFill = rankedHits.filter((hit) => {
    const score = hit.identityConfidence ?? 0;
    return score >= 30 && score < 50;
  });
  let payloadSourceHits = [...high, ...medium].slice(0, GEMINI_TOP_HIT_LIMIT);
  // Nur wenn keine High-Confidence-Treffer: niedrigere Scores für Substanz nachziehen
  if (high.length === 0 && payloadSourceHits.length < 12) {
    payloadSourceHits = [...payloadSourceHits, ...lowFill].slice(
      0,
      GEMINI_TOP_HIT_LIMIT
    );
  }

  const categories = aggregateByOsintCategory(payloadSourceHits).map(
    (item) => ({
      label: item.label,
      count: item.count,
      avgConfidence: item.avgConfidence,
      riskLevel: item.riskLevel,
    })
  );

  const sources = buildSourceLinks(payloadSourceHits).map((link) => ({
    platform: link.platform,
    url: link.url,
    title: link.title,
  }));

  const sensitive = detectSensitiveCategories(payloadSourceHits);
  const hasPublicEmail = payloadSourceHits.some((h) =>
    /@|e-?mail/i.test(`${h.title} ${h.snippet}`)
  );
  const hasPublicPhone = payloadSourceHits.some((h) =>
    /\+?\d[\d\s/-]{6,}|telefon/i.test(`${h.title} ${h.snippet}`)
  );
  const hasPublicAddress = payloadSourceHits.some((h) =>
    /straße|strasse|plz|\b\d{5}\b|adresse/i.test(`${h.title} ${h.snippet}`)
  );

  const payloadHits: GeminiHitPayload[] = payloadSourceHits.map((hit) => ({
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
    .filter((p) => p.maxConfidence >= GEMINI_PROFILE_MIN)
    .map((p) => ({
      platform: p.platform,
      host: p.host,
      url: p.url,
      pageCount: p.pageCount,
      category: p.category,
      confidence: p.maxConfidence,
    }));

  const sourceBlock = formatSourceMarkdown(buildSourceLinks(payloadSourceHits));

  const dehashedLeaks = (options?.dehashedLeaks ?? []).map((leak) => ({
    databaseName: leak.databaseName,
    identifier: leak.identifier,
    identifierType: leak.identifierType,
    dataClasses: leak.dataClasses,
    usernames: leak.usernames,
    emails: leak.emails,
    phones: leak.phones,
    leakedPasswords: leak.passwords,
    leakedPasswordHashes: leak.hashedPasswords,
    passwordExposed: leak.passwords.length > 0,
    hashExposed: leak.hashedPasswords.length > 0,
  }));

  const payload = {
    subject: subjectName,
    riskLevel,
    fingerprintHash: options?.fingerprintHash ?? null,
    hitCount: payloadSourceHits.length,
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
    dehashedLeaks,
    dehashedLeakCount: dehashedLeaks.length,
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

DEHASHED / DATENLECKS (zwingend):
Wenn im JSON-Feld "dehashedLeaks" Einträge vorhanden sind, musst du unter Abschnitt „5. Erkannte Risiken“ zwingend aufführen:
- welche Leak-Quellen (databaseName) betroffen sind,
- welche Daten kompromittiert wurden (dataClasses, E-Mails, Telefone, Benutzernamen),
- ob Klartext-Passwörter und/oder Passwort-Hashes geleakt wurden (leakedPasswords / leakedPasswordHashes),
- und den Nutzer klar auffordern, betroffene Passwörter sofort zu ändern und 2FA zu aktivieren.
Verschweige keine DeHashed-Funde.

Plattformnamen als Markdown-Links schreiben: [Plattform](https://…).
Jede wichtige Aussage braucht mindestens eine Quelle aus den Daten.

AUSGABESTRUKTUR (genau diese Abschnitte):

1. Digitales Kurzprofil
Nur die öffentlich auffindbare digitale Identität. Keine Aussagen über Charakter, Persönlichkeit, Politik, Religion oder private Beziehungen. Keine psychologischen Einschätzungen.

2. Management-Zusammenfassung
Maximal 8 Zeilen. Enthalten:
- Anzahl relevanter Treffer
- Aufschlüsselung nach Kategorien (Profile, Foren, Dokumente, Datenlecks, …)
- Öffentliche Telefonnummer: Ja/Nein
- Öffentliche Mail: Ja/Nein
- Öffentliche Anschrift: Ja/Nein
- DeHashed-Datenlecks: Anzahl

3. Öffentliche Profile
Aggregierte Profile mit Link. Format: - [Plattform](URL) — Fakten (Seitenzahl falls vorhanden)

4. Öffentliche Erwähnungen
Foren/Presse/Web mit Link.

5. Erkannte Risiken
Nur belegte Risiken. Nutze die threatMatrix-Werte, sensitiveFindings und dehashedLeaks. Ampel optional, aber faktenbasiert.

6. Handlungsempfehlungen
Konkret, auf einzelne Quellen bezogen. Nicht „Profil entfernen.“ sondern warum und was genau. Bei Leaks: Passwortwechsel priorisieren.

7. Quellenübersicht
Vollständige Liste klickbarer Quellen.

BEKANNTE QUELLEN:
${sourceBlock}

DATEN (JSON — einzige erlaubte Faktenbasis):
${JSON.stringify(payload)}`;

  return { verifiedHits: payloadSourceHits, payload, prompt };
}

export function postProcessGeminiSummary(
  raw: string,
  hits: IntelligenceHit[]
): string {
  const links = buildSourceLinks(
    hits.filter(
      (hit) =>
        isLiveIntelSource(hit.sourceType) && (hit.identityConfidence ?? 0) >= 30
    )
  );
  return linkifySummaryText(raw.trim(), links);
}
