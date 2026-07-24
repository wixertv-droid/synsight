import { extractSubjectTokens } from "@/lib/analysis/hit-quality";
import { getCategoryMeta } from "@/lib/analysis/hit-intel";
import type { IntelligenceHit } from "@/lib/analysis/types";

export interface IdentitySignals {
  subjectName: string;
  firstName?: string;
  lastName?: string;
  location?: string | null;
  company?: string | null;
  emails?: string[];
  phones?: string[];
  aliases?: string[];
  countryHints?: string[];
}

export interface ConfidenceBreakdown {
  score: number;
  label: string;
  positives: string[];
  negatives: string[];
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

/**
 * ConfidenceScorer / IdentityMatcher — Sprint 6B Gewichtung.
 */
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

  const hasFirst = first.length >= 2 && includesInsensitive(text, first);
  const hasLast = last.length >= 2 && includesInsensitive(text, last);

  if (hasFirst) {
    score += 25;
    positives.push("Vorname stimmt");
  }
  if (hasLast) {
    score += 25;
    positives.push("Nachname stimmt");
  }

  if (location.length >= 3 && includesInsensitive(text, location)) {
    score += 20;
    positives.push("Wohnort stimmt");
  }

  if (company.length >= 3 && includesInsensitive(text, company)) {
    score += 20;
    positives.push("Firma stimmt");
  }

  const matchedPhones = phoneMatches(text, phones);
  if (matchedPhones.length > 0) {
    score += 40;
    positives.push("Telefon stimmt");
  }

  const matchedEmails = emails.filter((email) =>
    includesInsensitive(text, email)
  );
  if (matchedEmails.length > 0) {
    score += 50;
    positives.push("E-Mail stimmt");
  }

  const matchedAliases = aliases.filter((alias) =>
    includesInsensitive(text, alias)
  );
  if (matchedAliases.length > 0) {
    score += 35;
    positives.push("Alias stimmt");
  }

  const meta = getCategoryMeta(hit.category, hit.url, hit.title);
  if (meta.filterKey === "image") {
    score += 10;
    positives.push("Profilbild / Medien");
  }
  if (
    meta.filterKey === "social" &&
    (hasFirst || hasLast || matchedAliases.length)
  ) {
    score += 15;
    positives.push("Social-Media-Link passt");
  }

  // Soft: only Nachname ohne Vorname
  if (hasLast && !hasFirst && first.length >= 2) {
    score -= 40;
    negatives.push("Nur Nachname gleich");
  } else if (first.length >= 2 && !hasFirst && hasLast) {
    score -= 40;
    negatives.push("Vorname unterschiedlich / fehlt");
  }

  // Cap and label
  score = Math.max(0, Math.min(100, score));

  // Soft floor when both names match strongly
  if (hasFirst && hasLast && score < 50) {
    score = Math.max(score, 55);
  }

  const label =
    score >= 90
      ? "Sehr hohe Übereinstimmung"
      : score >= 70
        ? "Hohe Übereinstimmung"
        : score >= 50
          ? "Möglicher Treffer"
          : "Geringe Übereinstimmung";

  return { score, label, positives, negatives };
}

export function buildSignalsFromIdentity(input: {
  subjectName: string;
  firstName?: string;
  lastName?: string;
  location?: string | null;
  company?: string | null;
  emails?: string[];
  phones?: string[];
  aliases?: string[];
}): IdentitySignals {
  const tokens = extractSubjectTokens(input.subjectName);
  return {
    subjectName: input.subjectName,
    firstName: input.firstName || tokens[0] || "",
    lastName: input.lastName || tokens[tokens.length - 1] || "",
    location: input.location,
    company: input.company,
    emails: input.emails ?? [],
    phones: input.phones ?? [],
    aliases: input.aliases ?? [],
  };
}
