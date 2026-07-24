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
 * Score-Engine — dynamische Gewichtung, keine Frühverwerfung bei starken Signalen.
 *
 * E-Mail / Telefon = +100 (Instant High)
 * Alias / Username = +85
 * Vorname + Nachname + Ort/Firma = +80
 * Vorname + Nachname = +50
 * Nur Nachname + Ort = +30
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

  const matchedAliases = aliases.filter((alias) =>
    includesInsensitive(text, alias)
  );
  const hasAlias = matchedAliases.length > 0;
  checks.push({ label: "Alias gefunden", found: hasAlias });

  // Instant high: contact identifiers
  if (hasEmail || hasPhone) {
    score = Math.max(score, 100);
    if (hasEmail) positives.push("E-Mail stimmt (+100)");
    if (hasPhone) positives.push("Telefon stimmt (+100)");
  }

  // Alias / username
  if (hasAlias) {
    score = Math.max(score, 85);
    positives.push("Alias/Username stimmt (+85)");
  }

  // Name + location/company
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

  // Additive nuance on top of floors (capped later)
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

  // Soft penalty only when NO strong identifier exists
  const hasStrongSignal = hasEmail || hasPhone || hasAlias;
  if (!hasStrongSignal && hasLast && !hasFirst && first.length >= 2) {
    score = Math.max(0, score - 15);
    negatives.push("Nur Nachname ohne Vorname/Alias");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Never drop strong identifier matches below high band
  if (hasEmail || hasPhone) score = Math.max(score, 92);
  if (hasAlias) score = Math.max(score, 70);

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
