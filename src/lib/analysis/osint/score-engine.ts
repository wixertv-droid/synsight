/**
 * Score-Engine — harte OSINT-Regeln gegen Namensvettern + Alias-Override.
 *
 * 1. Exakter Alias/Username in Text/URL → Score ≥ 90 (nie verwerfen)
 * 2. Name match + fremde Großstadt (nicht im Profil) → −40
 * 3. E-Mail/Telefon → Instant High
 */
import { extractSubjectTokens } from "@/lib/analysis/hit-quality";
import { getCategoryMeta } from "@/lib/analysis/hit-intel";
import type { IntelligenceHit } from "@/lib/analysis/types";

export interface IdentitySignals {
  subjectName: string;
  firstName?: string;
  lastName?: string;
  location?: string | null;
  /** Alle bekannten Wohnorte (aktuell + frühere) für Namensvetter-Filter */
  locations?: string[];
  company?: string | null;
  emails?: string[];
  phones?: string[];
  aliases?: string[];
  countryHints?: string[];
}

export interface ConfidenceCheck {
  label: string;
  found: boolean;
}

export interface ConfidenceBreakdown {
  score: number;
  label: string;
  positives: string[];
  negatives: string[];
  checks: ConfidenceCheck[];
}

/** Bekannte DE-Großstädte für Namensvetter-Penalty (wenn nicht im Profil). */
export const MAJOR_DE_CITIES = [
  "berlin",
  "hamburg",
  "münchen",
  "muenchen",
  "munich",
  "köln",
  "koeln",
  "cologne",
  "frankfurt",
  "stuttgart",
  "düsseldorf",
  "duesseldorf",
  "dortmund",
  "essen",
  "leipzig",
  "bremen",
  "dresden",
  "hannover",
  "nürnberg",
  "nuernberg",
  "nuremberg",
  "duisburg",
  "bochum",
  "wuppertal",
  "bielefeld",
  "bonn",
  "münster",
  "muenster",
  "karlsruhe",
  "mannheim",
  "augsburg",
  "wiesbaden",
  "freiburg",
  "kiel",
  "erfurt",
  "rostock",
  "mainz",
  "magdeburg",
  "potsdam",
  "saarbrücken",
  "saarbruecken",
  "lübeck",
  "luebeck",
  "chemnitz",
  "halle",
  "braunschweig",
  "kassel",
  "oldenburg",
  "osnabrück",
  "osnabrueck",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Exakter Alias-Match (kein Fuzzy / kein Teilwort-Noise).
 * "Luder-Anja" matcht nicht "Luna"; kurze Aliase brauchen Token-Grenzen.
 */
export function exactAliasMatch(haystack: string, alias: string): boolean {
  const needle = alias.trim().toLowerCase();
  if (needle.length < 2) return false;
  const hay = haystack.toLowerCase();

  // URL: oft ohne Leerzeichen, aber mit - _ / .
  const urlish = hay.replace(/[%20]/g, " ");
  if (urlish.includes(needle)) {
    if (needle.length >= 4) {
      // Längere Unique-Handles (Anja1921, Luder-Anja): exakter Substring reicht
      return true;
    }
  }

  // Token-Grenze: kein Match mitten im Wort (Luna ≠ Luder)
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}([^\\p{L}\\p{N}]|$)`,
    "iu"
  );
  return pattern.test(haystack);
}

function includesInsensitive(hay: string, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  return n.length >= 2 && hay.toLowerCase().includes(n);
}

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function phoneMatches(text: string, phones: string[]): string[] {
  const hayDigits = digitsOnly(text);
  return phones.filter((phone) => {
    const d = digitsOnly(phone);
    return d.length >= 6 && hayDigits.includes(d);
  });
}

function normalizeCity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function profileLocationSet(signals: IdentitySignals): Set<string> {
  const raw = [signals.location ?? "", ...(signals.locations ?? [])].filter(
    Boolean
  );
  const set = new Set<string>();
  for (const loc of raw) {
    const n = normalizeCity(loc);
    if (n.length >= 2) set.add(n);
    // auch Einzelteile "Gera" aus längeren Strings
    for (const part of n.split(/[\s,/|-]+/)) {
      if (part.length >= 2) set.add(part);
    }
  }
  return set;
}

/**
 * Fremde Großstadt im Treffer, die nicht zu den Profil-Wohnorten gehört.
 */
export function findForeignMajorCities(
  text: string,
  signals: IdentitySignals
): string[] {
  const known = profileLocationSet(signals);
  const hay = text.toLowerCase();
  const found: string[] = [];
  for (const city of MAJOR_DE_CITIES) {
    const cityNorm = normalizeCity(city);
    if (known.has(cityNorm)) continue;
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapeRegExp(city)}([^\\p{L}\\p{N}]|$)`,
      "iu"
    );
    if (pattern.test(hay)) {
      found.push(city);
    }
  }
  return found;
}

export function scoreIdentityConfidence(
  hit: Pick<
    IntelligenceHit,
    "title" | "snippet" | "url" | "category" | "sourceType"
  >,
  signals: IdentitySignals
): ConfidenceBreakdown {
  if (hit.sourceType === "identity_profile") {
    return {
      score: 96,
      label: "Sehr hohe Übereinstimmung (Profil-Verknüpfung)",
      positives: ["Direkt aus dem Identitätsprofil"],
      negatives: [],
      checks: [{ label: "Profil-Verknüpfung", found: true }],
    };
  }

  const text = `${hit.title} ${hit.snippet} ${hit.url}`;
  const first = (signals.firstName ?? "").trim();
  const last = (signals.lastName ?? "").trim();
  const location = (signals.location ?? "").trim();
  const company = (signals.company ?? "").trim();
  const emails = (signals.emails ?? []).map((e) => e.trim()).filter(Boolean);
  const phones = (signals.phones ?? []).map((p) => p.trim()).filter(Boolean);
  const aliases = (signals.aliases ?? []).map((a) => a.trim()).filter(Boolean);

  let score = 0;
  const positives: string[] = [];
  const negatives: string[] = [];
  const checks: ConfidenceCheck[] = [];

  const hasFirst = first.length >= 2 && includesInsensitive(text, first);
  const hasLast = last.length >= 2 && includesInsensitive(text, last);
  checks.push({ label: "Vorname gefunden", found: hasFirst });
  checks.push({ label: "Nachname gefunden", found: hasLast });

  const hasLocation =
    location.length >= 3 && includesInsensitive(text, location);
  checks.push({ label: "Wohnort gefunden", found: hasLocation });

  const hasCompany = company.length >= 3 && includesInsensitive(text, company);
  checks.push({ label: "Firma gefunden", found: hasCompany });

  const matchedPhones = phoneMatches(text, phones);
  const hasPhone = matchedPhones.length > 0;
  checks.push({ label: "Telefon gefunden", found: hasPhone });

  const matchedEmails = emails.filter((email) =>
    includesInsensitive(text, email)
  );
  const hasEmail = matchedEmails.length > 0;
  checks.push({ label: "Mail gefunden", found: hasEmail });

  // HARTE REGEL 1 — exakter Alias-Override (wichtigste Regel)
  const matchedAliases = aliases.filter((alias) =>
    exactAliasMatch(text, alias)
  );
  const hasAlias = matchedAliases.length > 0;
  checks.push({ label: "Alias gefunden", found: hasAlias });

  if (hasEmail || hasPhone) {
    score = Math.max(score, 100);
    if (hasEmail) positives.push("E-Mail stimmt (+100)");
    if (hasPhone) positives.push("Telefon stimmt (+100)");
  }

  if (hasAlias) {
    score = Math.max(score, 90);
    positives.push(
      `Alias/Username exakt: ${matchedAliases.slice(0, 3).join(", ")} (+90)`
    );
  }

  if (hasFirst && hasLast && (hasLocation || hasCompany)) {
    score = Math.max(score, 80);
    positives.push(hasLocation ? "Name + Wohnort (+80)" : "Name + Firma (+80)");
  } else if (hasFirst && hasLast) {
    score = Math.max(score, 50);
    positives.push("Vorname + Nachname (+50)");
  } else if (hasLast && hasLocation && !hasFirst) {
    score = Math.max(score, 30);
    positives.push("Nachname + Wohnort (+30)");
  }

  if (hasFirst) score += 5;
  if (hasLast) score += 5;
  if (hasLocation) score += 8;
  if (hasCompany) score += 8;

  const meta = getCategoryMeta(hit.category, hit.url, hit.title);
  if (meta.filterKey === "image" && (hasFirst || hasLast || hasAlias)) {
    score += 8;
    positives.push("Profilbild / Medien");
    checks.push({ label: "Profilbild vorhanden", found: true });
  }
  if (meta.filterKey === "social" && (hasFirst || hasLast || hasAlias)) {
    score += 10;
    positives.push("Social-Media-Link passt");
    checks.push({ label: "Social Handle passt", found: true });
  }

  // HARTE REGEL 2 — Namensvetter: Name matcht, aber fremde Großstadt
  const foreignCities = findForeignMajorCities(text, signals);
  if (hasFirst && hasLast && foreignCities.length > 0 && !hasLocation) {
    score -= 40;
    negatives.push(
      `Namensvetter-Filter: fremde Stadt (${foreignCities.slice(0, 2).join(", ")}) (−40)`
    );
  }

  if (
    !hasAlias &&
    !hasEmail &&
    !hasPhone &&
    hasLast &&
    !hasFirst &&
    first.length >= 2
  ) {
    score = Math.max(0, score - 15);
    negatives.push("Nur Nachname ohne Vorname/Alias");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Alias-/Kontakt-Override nach Penalty erneut absichern
  if (hasEmail || hasPhone) score = Math.max(score, 92);
  if (hasAlias) score = Math.max(score, 90);

  const label =
    score >= 90
      ? "Sehr hohe Übereinstimmung"
      : score >= 70
        ? "Hohe Übereinstimmung"
        : score >= 50
          ? "Möglicher Treffer"
          : "Geringe Übereinstimmung";

  return { score, label, positives, negatives, checks };
}

export function buildSignalsFromIdentity(input: {
  subjectName: string;
  firstName?: string;
  lastName?: string;
  location?: string | null;
  locations?: string[];
  company?: string | null;
  emails?: string[];
  phones?: string[];
  aliases?: string[];
}): IdentitySignals {
  const tokens = extractSubjectTokens(input.subjectName);
  const locations = [...(input.locations ?? []), input.location ?? ""].filter(
    (v) => v.trim().length > 0
  );
  return {
    subjectName: input.subjectName,
    firstName: input.firstName || tokens[0] || "",
    lastName: input.lastName || tokens[tokens.length - 1] || "",
    location: input.location,
    locations,
    company: input.company,
    emails: input.emails ?? [],
    phones: input.phones ?? [],
    aliases: input.aliases ?? [],
  };
}
