import {
  extractSubjectTokens,
  textMatchesSubject,
} from "@/lib/analysis/hit-quality";
import {
  buildSignalsFromIdentity,
  scoreIdentityConfidence,
} from "@/lib/analysis/osint/confidence-scorer";
import type {
  IntelligenceHit,
  IntelligenceHitRisk,
  IntelligenceReportScorecard,
} from "@/lib/analysis/types";

export type HitSeverity = "critical" | "high" | "medium" | "low";

export interface HitIntelContext {
  subjectName: string;
  firstName?: string;
  lastName?: string;
  location?: string | null;
  company?: string | null;
  emails?: string[];
  phones?: string[];
  aliases?: string[];
}

export interface HitAiEvaluation {
  stars: number;
  headline: string;
  reasons: string[];
  dangers: string[];
  recommendation: string;
}

const CATEGORY_META: Record<
  string,
  { label: string; chipClass: string; filterKey: string }
> = {
  name: {
    label: "Name",
    chipClass: "border-sky-400/35 bg-sky-400/15 text-sky-100",
    filterKey: "name",
  },
  phone: {
    label: "Telefon",
    chipClass: "border-orange-400/35 bg-orange-400/15 text-orange-100",
    filterKey: "phone",
  },
  email: {
    label: "E-Mail",
    chipClass: "border-violet-400/35 bg-violet-400/15 text-violet-100",
    filterKey: "email",
  },
  social: {
    label: "Social Media",
    chipClass: "border-fuchsia-400/35 bg-fuchsia-400/15 text-fuchsia-100",
    filterKey: "social",
  },
  address: {
    label: "Ort",
    chipClass: "border-teal-400/35 bg-teal-400/15 text-teal-100",
    filterKey: "address",
  },
  company: {
    label: "Arbeitgeber",
    chipClass: "border-rose-400/35 bg-rose-400/15 text-rose-100",
    filterKey: "company",
  },
  alias: {
    label: "Alias",
    chipClass: "border-amber-300/35 bg-amber-300/15 text-amber-100",
    filterKey: "alias",
  },
  website: {
    label: "Webseite",
    chipClass: "border-cyan-400/35 bg-cyan-400/15 text-cyan-100",
    filterKey: "website",
  },
  general: {
    label: "Allgemein",
    chipClass: "border-white/20 bg-white/10 text-white/70",
    filterKey: "general",
  },
  forum: {
    label: "Forum",
    chipClass: "border-emerald-400/35 bg-emerald-400/15 text-emerald-100",
    filterKey: "forum",
  },
  image: {
    label: "Bilder",
    chipClass: "border-yellow-300/35 bg-yellow-300/15 text-yellow-100",
    filterKey: "image",
  },
  document: {
    label: "Dokumente",
    chipClass: "border-indigo-300/35 bg-indigo-300/15 text-indigo-100",
    filterKey: "document",
  },
};

export function getCategoryMeta(category: string, url = "", title = "") {
  const blob = `${url} ${title}`.toLowerCase();
  if (
    category === "social" ||
    /linkedin|xing|facebook|instagram|twitter|x\.com|tiktok/.test(blob)
  ) {
    return CATEGORY_META.social;
  }
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || /\/photos?\//i.test(url)) {
    return CATEGORY_META.image;
  }
  if (/\.(pdf|docx?|xlsx?)(\?|$)/i.test(url)) {
    return CATEGORY_META.document;
  }
  if (/forum|reddit|board|community/.test(blob)) {
    return CATEGORY_META.forum;
  }
  return CATEGORY_META[category] ?? CATEGORY_META.general;
}

export function riskToSeverity(risk: IntelligenceHitRisk): HitSeverity {
  switch (risk) {
    case "action":
      return "critical";
    case "review":
      return "high";
    case "watch":
      return "medium";
    default:
      return "low";
  }
}

export function severityLabel(severity: HitSeverity): string {
  switch (severity) {
    case "critical":
      return "Kritisch";
    case "high":
      return "Hoch";
    case "medium":
      return "Mittel";
    default:
      return "Niedrig";
  }
}

export function severityPercent(
  severity: HitSeverity,
  riskScoreHint = 0
): number {
  switch (severity) {
    case "critical":
      return Math.max(85, Math.min(98, 85 + Math.round(riskScoreHint / 20)));
    case "high":
      return 72;
    case "medium":
      return 48;
    default:
      return 22;
  }
}

function matchCount(text: string, values: string[]): string[] {
  const hay = text.toLowerCase();
  return values
    .map((value) => value.trim())
    .filter((value) => value.length >= 3 && hay.includes(value.toLowerCase()));
}

/**
 * Rule-based OSINT evaluation — Sprint 6B ConfidenceScorer.
 * Does not invent findings.
 */
export function enrichHitIntel(
  hit: IntelligenceHit,
  context: HitIntelContext
): IntelligenceHit {
  const text = `${hit.title} ${hit.snippet} ${hit.url}`;
  const subjectTokens = extractSubjectTokens(context.subjectName);
  const matchedNameTokens = subjectTokens.filter((token) =>
    text.toLowerCase().includes(token)
  );
  const location = (context.location ?? "").trim();
  const matchedEmails = matchCount(text, context.emails ?? []);
  const matchedPhones = matchCount(text, context.phones ?? []);
  const hasLocation =
    location.length >= 3 && text.toLowerCase().includes(location.toLowerCase());
  const meta = getCategoryMeta(hit.category, hit.url, hit.title);
  const isSocial = meta.filterKey === "social";
  const isImage = meta.filterKey === "image";
  const isForum = meta.filterKey === "forum";

  const scored = scoreIdentityConfidence(
    hit,
    buildSignalsFromIdentity({
      subjectName: context.subjectName,
      firstName: context.firstName,
      lastName: context.lastName,
      location: context.location,
      company: context.company,
      emails: context.emails,
      phones: context.phones,
      aliases: context.aliases,
    })
  );
  const confidence = scored.score;

  const reasons: string[] = [...scored.positives];
  if (isSocial && !reasons.some((r) => /Social/i.test(r))) {
    reasons.push("Social-Media-Profil / Beitrag");
  }
  if (isForum) reasons.push("Foren- oder Community-Eintrag");
  if (hit.isPublic) reasons.push("Öffentlich indexiert");
  if (reasons.length === 0) reasons.push("Über Profil-Suchanfrage gefunden");
  for (const neg of scored.negatives) {
    reasons.push(`⚠ ${neg}`);
  }
  const dangers: string[] = [];
  if (hit.isPublic) {
    dangers.push("Profil oder Seite kann über Suchmaschinen gefunden werden");
  }
  if (isImage) dangers.push("Bilder sind öffentlich sichtbar");
  if (isSocial) {
    dangers.push("Social Engineering über öffentliche Beiträge möglich");
  }
  if (matchedEmails.length > 0 || matchedPhones.length > 0) {
    dangers.push("Kontaktdaten sind ohne Login einsehbar");
  }
  if (isForum) {
    dangers.push("Alte Foreneinträge können lange im Index bleiben");
  }
  if (dangers.length === 0) {
    dangers.push("Öffentliche Sichtbarkeit ohne akuten Datenleak");
  }

  const severity = riskToSeverity(hit.risk);
  const riskPercent = severityPercent(severity, hit.shouldAct ? 20 : 0);

  let recommendation = hit.recommendation;
  if (isSocial) {
    recommendation =
      "Privatsphäre-Einstellungen der Plattform prüfen und öffentliche Beiträge begrenzen.";
  } else if (matchedEmails.length > 0 || matchedPhones.length > 0) {
    recommendation =
      "Seitenbetreiber kontaktieren und Entfernung oder Anonymisierung der Kontaktdaten beantragen.";
  } else if (severity === "critical" || severity === "high") {
    recommendation =
      "Treffer öffnen, Inhalt prüfen und bei Bedarf Löschung oder Korrektur anstoßen.";
  } else if (confidence < 50) {
    recommendation =
      "Wahrscheinlich Namensgleichheit — beobachten, keine Sofortmaßnahme nötig.";
  } else {
    recommendation =
      recommendation ||
      "Treffer im Blick behalten und nach größeren Profiländerungen erneut prüfen.";
  }

  const stars =
    confidence >= 85
      ? 5
      : confidence >= 70
        ? 4
        : confidence >= 50
          ? 3
          : confidence >= 30
            ? 2
            : 1;

  const headline =
    confidence >= 90
      ? "Treffer gehört mit sehr hoher Wahrscheinlichkeit zu Ihrer Person."
      : confidence >= 70
        ? "Treffer gehört mit hoher Wahrscheinlichkeit zu Ihrer Person."
        : confidence >= 50
          ? "Treffer könnte zu Ihrer Person gehören — Prüfung empfohlen."
          : "Wahrscheinlich Namensgleichheit oder nur schwacher Bezug.";

  const confidenceLabel = scored.label;

  const whyFoundPlain = buildWhyFoundPlain({
    subjectName: context.subjectName,
    matchedNameTokens,
    hasLocation,
    location,
    isSocial,
    isForum,
    query: hit.query,
  });

  const whyRelevantPlain =
    confidence >= 70
      ? "Mehrere Profilsignale (Name und weitere Merkmale) passen zu diesem Treffer."
      : confidence >= 50
        ? "Es gibt Überschneidungen mit Ihren Profildaten, aber keine vollständige Bestätigung."
        : "Der Bezug zu Ihrer Identität ist schwach — Fehlalarm möglich.";

  const belongsToYou =
    confidence >= 70
      ? "Ja, sehr wahrscheinlich"
      : confidence >= 50
        ? "Unklar — prüfen"
        : "Eher Nein";

  const needsAction =
    hit.shouldAct && confidence >= 50
      ? "Ja — Maßnahme empfohlen"
      : hit.risk === "watch"
        ? "Beobachten"
        : "Nein — optional";

  const isDangerous =
    hit.isProblematic && confidence >= 50
      ? "Ja — erhöhte Aufmerksamkeit"
      : "Gering / unkritisch";

  const aiEvaluation: HitAiEvaluation = {
    stars,
    headline,
    reasons,
    dangers: dangers.slice(0, 4),
    recommendation,
  };

  return {
    ...hit,
    displayCategory: meta.label,
    filterCategory: meta.filterKey,
    severity,
    riskPercent,
    identityConfidence: confidence,
    identityConfidenceLabel: confidenceLabel,
    whyFoundPlain,
    whyRelevantPlain,
    belongsToYou,
    isDangerous,
    needsAction,
    aiEvaluation,
    recommendation,
  };
}

function buildWhyFoundPlain(input: {
  subjectName: string;
  matchedNameTokens: string[];
  hasLocation: boolean;
  location: string;
  isSocial: boolean;
  isForum: boolean;
  query: string;
}): string {
  const parts: string[] = [];
  if (input.matchedNameTokens.length >= 2) {
    parts.push(
      `Ihr Name „${input.subjectName}" wurde in Titel oder Snippet gefunden.`
    );
  } else if (input.matchedNameTokens.length === 1) {
    parts.push(
      `Ein Namensbestandteil („${input.matchedNameTokens[0]}") taucht in diesem Treffer auf.`
    );
  } else {
    parts.push(`Gefunden über Ihre Profil-Suchanfrage „${input.query}".`);
  }
  if (input.hasLocation && input.location) {
    parts.push(`Zusätzlich passt der Ort „${input.location}".`);
  }
  if (input.isSocial) {
    parts.push(
      "Der Eintrag liegt auf einer öffentlichen Social-Media-Seite und ist über Google erreichbar."
    );
  }
  if (input.isForum) {
    parts.push(
      "Es handelt sich um einen öffentlichen Foren- oder Community-Beitrag."
    );
  }
  return parts.join(" ");
}

export function buildReportScorecard(
  hits: IntelligenceHit[]
): IntelligenceReportScorecard {
  const live = hits.filter((hit) => hit.sourceType === "serpapi_google");
  const likely = live.filter((hit) => (hit.identityConfidence ?? 0) >= 70);
  const critical = live.filter((hit) => hit.severity === "critical").length;
  const high = live.filter((hit) => hit.severity === "high").length;

  const avgConfidence =
    live.length === 0
      ? 0
      : Math.round(
          live.reduce((sum, hit) => sum + (hit.identityConfidence ?? 0), 0) /
            live.length
        );

  const publicVisibility = Math.min(
    100,
    Math.round(
      (likely.length / Math.max(1, live.length)) * 70 + avgConfidence * 0.3
    )
  );
  const identityRisk = Math.min(
    100,
    Math.round(
      ((critical * 18 + high * 10 + likely.length * 4) /
        Math.max(1, live.length + 3)) *
        8
    )
  );
  const privacyScore = Math.max(8, 100 - identityRisk);

  const overallScore = Math.min(
    100,
    Math.round(
      identityRisk * 0.55 + publicVisibility * 0.25 + (100 - privacyScore) * 0.2
    )
  );

  return {
    overallScore,
    privacyScore,
    publicVisibility,
    identityRisk,
    likelyMeCount: likely.length,
    criticalCount: critical,
    highCount: high,
    totalLive: live.length,
  };
}

export function buildStructuredAnalysisSummary(
  subjectName: string,
  hits: IntelligenceHit[],
  scorecard: IntelligenceReportScorecard
): string {
  const live = hits.filter((hit) => hit.sourceType === "serpapi_google");
  const likely = live.filter((hit) => (hit.identityConfidence ?? 0) >= 70);
  const byCat = (key: string) =>
    likely.filter((hit) => hit.filterCategory === key).length;

  const social = byCat("social");
  const forums = byCat("forum");
  const websites = byCat("website") + byCat("name") + byCat("general");
  const other = Math.max(0, likely.length - social - forums - websites);
  const weak = live.length - likely.length;

  const riskLabel =
    scorecard.identityRisk >= 70
      ? "hoch"
      : scorecard.identityRisk >= 40
        ? "mittel"
        : "niedrig";

  const lines: string[] = [];

  lines.push(
    `Kurz gesagt: Von ${live.length} öffentlichen Google-Treffern gehören ${likely.length} sehr wahrscheinlich zu ${subjectName}.`
  );

  if (likely.length === 0) {
    lines.push(
      "Es wurden keine klar zuordenbaren Treffer gefunden. Das ist gut — aktuell wirkt Ihre digitale Spur auf Google eher unauffällig."
    );
  } else {
    const parts: string[] = [];
    if (social > 0) {
      parts.push(`${social}× Social Media (z. B. Profile oder Erwähnungen)`);
    }
    if (forums > 0) {
      parts.push(`${forums}× Foren oder Diskussionsbeiträge`);
    }
    if (websites > 0) {
      parts.push(`${websites}× Webseiten mit personenbezogenen Hinweisen`);
    }
    if (other > 0) {
      parts.push(`${other}× weitere Treffer`);
    }
    if (parts.length > 0) {
      lines.push(`Davon betreffen Sie besonders: ${parts.join(", ")}.`);
    }
  }

  if (weak > 0) {
    lines.push(
      `${weak} weitere Treffer sind eher Namensvettern oder ähnliche Themen — für Sie aktuell kein akutes Risiko.`
    );
  }

  lines.push(
    `Risiko-Einschätzung: ${riskLabel} (Gesamt-Score ${scorecard.overallScore} von 100). ${scorecard.criticalCount} Treffer sind kritisch und ${scorecard.highCount} hoch priorisiert.`
  );

  if (scorecard.criticalCount > 0) {
    lines.push(
      "Empfehlung: Öffnen Sie zuerst die kritischen Treffer und prüfen Sie, ob dort private Daten (Telefon, Adresse, E-Mail) sichtbar sind."
    );
  } else if (likely.length > 0) {
    lines.push(
      "Empfehlung: Schauen Sie die Treffer unter „Betrifft mich“ an und entscheiden Sie, was öffentlich bleiben soll."
    );
  } else {
    lines.push(
      "Empfehlung: Profil weiter vervollständigen und die Analyse später wiederholen."
    );
  }

  return lines.join("\n\n");
}

export function isLikelyIdentityHit(hit: IntelligenceHit): boolean {
  return (
    (hit.identityConfidence ?? 0) >= 70 || hit.sourceType === "identity_profile"
  );
}

export function subjectMatched(
  hit: IntelligenceHit,
  subjectName: string
): boolean {
  return textMatchesSubject(
    `${hit.title} ${hit.snippet} ${hit.url}`,
    extractSubjectTokens(subjectName)
  );
}
