import {
  extractSubjectTokens,
  textMatchesSubject,
} from "@/lib/analysis/hit-quality";
import type {
  IntelligenceHit,
  IntelligenceHitRisk,
  IntelligenceReportScorecard,
} from "@/lib/analysis/types";

export type HitSeverity = "critical" | "high" | "medium" | "low";

export interface HitIntelContext {
  subjectName: string;
  location?: string | null;
  company?: string | null;
  emails?: string[];
  phones?: string[];
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
 * Rule-based OSINT evaluation — only uses signals present in the hit + profile.
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
  const company = (context.company ?? "").trim();
  const matchedEmails = matchCount(text, context.emails ?? []);
  const matchedPhones = matchCount(text, context.phones ?? []);
  const hasLocation =
    location.length >= 3 && text.toLowerCase().includes(location.toLowerCase());
  const hasCompany =
    company.length >= 3 && text.toLowerCase().includes(company.toLowerCase());
  const meta = getCategoryMeta(hit.category, hit.url, hit.title);
  const isSocial = meta.filterKey === "social";
  const isImage = meta.filterKey === "image";
  const isForum = meta.filterKey === "forum";

  let confidence = 18;
  if (hit.sourceType === "identity_profile") confidence = 96;
  if (matchedNameTokens.length >= 2) confidence += 42;
  else if (matchedNameTokens.length === 1) confidence += 18;
  if (hasLocation) confidence += 16;
  if (hasCompany) confidence += 12;
  if (matchedEmails.length > 0) confidence += 28;
  if (matchedPhones.length > 0) confidence += 28;
  if (isSocial && matchedNameTokens.length > 0) confidence += 10;
  if (hit.risk === "action") confidence += 6;
  if (hit.relevance === "low" && matchedNameTokens.length < 2) confidence -= 20;
  confidence = Math.max(8, Math.min(99, confidence));

  const reasons: string[] = [];
  if (matchedNameTokens.length >= 2) reasons.push("Name gefunden");
  else if (matchedNameTokens.length === 1)
    reasons.push("Namensbestandteil gefunden");
  if (hasLocation) reasons.push("Wohnort / Ort gefunden");
  if (hasCompany) reasons.push("Arbeitgeber / Firma gefunden");
  if (matchedEmails.length > 0) reasons.push("E-Mail-Adresse gefunden");
  if (matchedPhones.length > 0) reasons.push("Telefonnummer gefunden");
  if (isSocial) reasons.push("Social-Media-Profil / Beitrag");
  if (isImage) reasons.push("Öffentliches Bild / Foto");
  if (isForum) reasons.push("Foren- oder Community-Eintrag");
  if (hit.isPublic) reasons.push("Öffentlich indexiert");
  if (reasons.length === 0) reasons.push("Über Profil-Suchanfrage gefunden");

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
  } else if (confidence < 45) {
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
    confidence >= 75
      ? "Treffer gehört mit hoher Wahrscheinlichkeit zu Ihrer Person."
      : confidence >= 45
        ? "Treffer könnte zu Ihrer Person gehören — Prüfung empfohlen."
        : "Wahrscheinlich Namensgleichheit oder nur schwacher Bezug.";

  const confidenceLabel =
    confidence >= 75
      ? "Sehr wahrscheinlich dieselbe Person"
      : confidence >= 45
        ? "Möglicher Bezug — manuell prüfen"
        : "Wahrscheinlich Namensgleichheit";

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
    confidence >= 75
      ? "Mehrere Profilsignale (Name und weitere Merkmale) passen zu diesem Treffer."
      : confidence >= 45
        ? "Es gibt Überschneidungen mit Ihren Profildaten, aber keine vollständige Bestätigung."
        : "Der Bezug zu Ihrer Identität ist schwach — Fehlalarm möglich.";

  const belongsToYou =
    confidence >= 75
      ? "Ja, sehr wahrscheinlich"
      : confidence >= 45
        ? "Unklar — prüfen"
        : "Eher Nein";

  const needsAction =
    hit.shouldAct && confidence >= 40
      ? "Ja — Maßnahme empfohlen"
      : hit.risk === "watch"
        ? "Beobachten"
        : "Nein — optional";

  const isDangerous =
    hit.isProblematic && confidence >= 40
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
  const likely = live.filter((hit) => (hit.identityConfidence ?? 0) >= 60);
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
    Math.round((likely.length / Math.max(1, live.length)) * 100)
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
  const likely = live.filter((hit) => (hit.identityConfidence ?? 0) >= 60);
  const byCat = (key: string) =>
    likely.filter((hit) => hit.filterCategory === key).length;

  const social = byCat("social");
  const forums = byCat("forum");
  const websites = byCat("website") + byCat("name") + byCat("general");
  const other = Math.max(0, likely.length - social - forums - websites);
  const weak = live.length - likely.length;

  return `Von ${live.length} gefundenen Treffern konnten ${likely.length} mit hoher Wahrscheinlichkeit der digitalen Identität von ${subjectName} zugeordnet werden. Davon enthalten ${social} öffentlich sichtbare Social-Media-Bezüge, ${forums} Foreneinträge und ${websites} Webseiten mit personenbezogenen Signalen${other > 0 ? ` sowie ${other} weitere Zuordnungen` : ""}. ${
    weak > 0
      ? `Die übrigen ${weak} Treffer sind überwiegend Namensgleichheiten oder thematisch ähnliche Inhalte und stellen aktuell kein relevantes Risiko dar.`
      : "Schwache oder unklare Treffer wurden weitgehend herausgefiltert."
  } Gesamt-Score ${scorecard.overallScore}/100 · Identitätsrisiko ${scorecard.identityRisk} % · ${scorecard.criticalCount} kritisch, ${scorecard.highCount} hoch.`;
}

export function isLikelyIdentityHit(hit: IntelligenceHit): boolean {
  return (
    (hit.identityConfidence ?? 0) >= 60 || hit.sourceType === "identity_profile"
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
