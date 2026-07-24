import type {
  IntelligenceHit,
  IntelligenceRelevance,
} from "@/lib/analysis/types";
import { exactAliasMatch } from "@/lib/analysis/osint/score-engine";

/** Domains / URL patterns that rarely contain useful identity OSINT. */
const JUNK_HOST_PATTERNS = [
  /yellowpages/i,
  /dasoertliche\.de$/i,
  /dastelefonbuch\.de$/i,
  /11880\.com$/i,
  /goyellow\.de$/i,
  /meinestadt\.de$/i,
  /kleinanzeigen\.de$/i,
  /ebay\./i,
  /pinterest\./i,
  /tumblr\.com$/i,
  /scribd\.com$/i,
  /slideshare\.net$/i,
  /issuu\.com$/i,
  /quizlet\.com$/i,
  /brainly\./i,
  /wattpad\.com$/i,
  /fandom\.com$/i,
  /wikipedia\.org$/i,
  /wiktionary\.org$/i,
  /translate\.google\./i,
  /webcache\.googleusercontent\.com$/i,
  /google\.[a-z.]+$/i,
  /bing\.com$/i,
  /duckduckgo\.com$/i,
  /yahoo\.com$/i,
];

const JUNK_PATH_OR_TITLE = [
  /cookie.?policy/i,
  /privacy.?policy/i,
  /datenschutz/i,
  /agb\b/i,
  /terms.?of.?service/i,
  /login\b/i,
  /sign.?in\b/i,
  /cart\b/i,
  /checkout\b/i,
  /sitemap\.xml/i,
];

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function extractSubjectTokens(subjectName: string): string[] {
  return subjectName
    .toLowerCase()
    .split(/[\s,./_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function textMatchesSubject(
  text: string,
  subjectTokens: string[]
): boolean {
  if (subjectTokens.length === 0) return true;
  const haystack = text.toLowerCase();
  const matched = subjectTokens.filter((token) => haystack.includes(token));
  // Require majority of name tokens for multi-token subjects
  if (subjectTokens.length >= 2) {
    return matched.length >= Math.ceil(subjectTokens.length / 2);
  }
  return matched.length > 0;
}

export function isJunkHit(input: {
  title: string;
  snippet: string;
  url: string;
}): boolean {
  const host = hostnameOf(input.url);
  if (JUNK_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
    return true;
  }
  const blob = `${input.title} ${input.snippet} ${input.url}`;
  return JUNK_PATH_OR_TITLE.some((pattern) => pattern.test(blob));
}

/**
 * Rank / filter SERP hits: dedupe URLs, drop obvious junk, prefer subject matches.
 * Profile-linked hits are always kept.
 * Strong signals (E-Mail, Telefon, Alias, Name+Ort) werden nicht früh verworfen.
 */
export function refineSerpHits(
  hits: IntelligenceHit[],
  subjectName: string,
  options?: {
    emails?: string[];
    phones?: string[];
    aliases?: string[];
    location?: string | null;
    locations?: string[];
  }
): IntelligenceHit[] {
  const subjectTokens = extractSubjectTokens(subjectName);
  const emails = (options?.emails ?? []).map((e) => e.toLowerCase());
  const aliases = (options?.aliases ?? [])
    .map((a) => a.trim())
    .filter((a) => a.length >= 2);
  const location = (options?.location ?? "").trim().toLowerCase();
  const phoneDigits = (options?.phones ?? [])
    .map((p) => p.replace(/\D+/g, ""))
    .filter((d) => d.length >= 6);
  const seen = new Set<string>();
  const refined: IntelligenceHit[] = [];

  for (const hit of hits) {
    if (hit.sourceType === "identity_profile") {
      refined.push(hit);
      continue;
    }

    const key = normalizeUrlKey(hit.url);
    if (seen.has(key)) continue;
    seen.add(key);

    if (isJunkHit(hit)) continue;

    const subjectText = `${hit.title} ${hit.snippet} ${hit.url}`;
    const lower = subjectText.toLowerCase();
    const digitHay = subjectText.replace(/\D+/g, "");
    const matchesSubject = textMatchesSubject(subjectText, subjectTokens);
    const matchesEmail = emails.some((email) => lower.includes(email));
    // Exakter Alias-Match — kein Fuzzy (Luder-Anja ≠ Luna)
    const matchesAlias = aliases.some((alias) =>
      exactAliasMatch(subjectText, alias)
    );
    const matchesPhone = phoneDigits.some((digits) =>
      digitHay.includes(digits)
    );
    const matchesLocation = location.length >= 3 && lower.includes(location);
    const nameTokensHit = subjectTokens.filter((t) => lower.includes(t));
    const matchesNameLocation = nameTokensHit.length >= 1 && matchesLocation;

    const sensitive =
      hit.category === "email" ||
      hit.category === "phone" ||
      hit.category === "adult" ||
      hit.category === "alias" ||
      hit.risk === "action" ||
      hit.risk === "review" ||
      matchesEmail ||
      matchesPhone ||
      matchesAlias ||
      matchesNameLocation;

    // Alias-Treffer niemals verwerfen — auch ohne echten Namen
    if (!matchesSubject && !sensitive) {
      if (!(hit.relevance === "neutral" && hit.risk === "watch")) {
        continue;
      }
    }

    let relevance: IntelligenceRelevance = hit.relevance;
    let whyRelevant = hit.whyRelevant;
    if (matchesAlias) {
      relevance = "relevant";
      whyRelevant =
        "Exakter Benutzername/Alias gefunden — auch ohne Vor-/Nachname hochrelevant.";
    } else if (matchesSubject && hit.relevance === "low") {
      relevance = "neutral";
      whyRelevant =
        "Der Treffer bezieht sich erkennbar auf Ihren Namen oder Profilbezug.";
    } else if (!matchesSubject && sensitive) {
      whyRelevant =
        matchesEmail || matchesPhone
          ? "Kontaktdaten-Match — auch ohne klaren Namensmatch relevant."
          : "Standort-/Identitäts-Signale — auch ohne vollständigen Namensmatch relevant.";
    }

    refined.push({
      ...hit,
      relevance,
      whyRelevant,
      canIgnore: hit.canIgnore && !sensitive && !matchesAlias,
    });
  }

  const priority = (hit: IntelligenceHit): number => {
    if (hit.risk === "action") return 0;
    if (hit.risk === "review") return 1;
    if ((hit.identityConfidence ?? 0) >= 85) return 1;
    if (hit.relevance === "relevant") return 2;
    if (hit.risk === "watch") return 3;
    if (hit.relevance === "neutral") return 4;
    return 5;
  };

  return refined.sort((a, b) => {
    const conf = (b.identityConfidence ?? 0) - (a.identityConfidence ?? 0);
    if (Math.abs(conf) >= 10) return conf;
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "de");
  });
}

/** Primary hits shown by default in the report UI. */
export function isPrimaryHit(hit: IntelligenceHit): boolean {
  if (hit.sourceType === "identity_profile") return true;
  if (hit.risk === "action" || hit.risk === "review") return true;
  if (hit.relevance === "relevant" || hit.relevance === "neutral") return true;
  if (hit.risk === "watch") return true;
  return false;
}
