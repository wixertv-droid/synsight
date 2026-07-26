import type { IdentityView } from "@/lib/services/identity-service";
import type {
  UsernameConfidenceBand,
  UsernameMatchCheck,
} from "@/lib/analysis/username/types";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function includesToken(haystack: string, token: string): boolean {
  const t = norm(token);
  if (t.length < 2) return false;
  return haystack.includes(t);
}

/** Obvious non-person noise: SKU, part numbers, repos-as-ids, etc. */
export function isUsernameNoiseHit(input: {
  username: string;
  title: string;
  snippet: string;
  url: string;
}): boolean {
  const haystack = `${input.title} ${input.snippet} ${input.url}`;
  const username = norm(input.username);
  if (!username) return true;

  // Pure numeric / short catalog style without name context
  if (
    /\b(sku|artikelnummer|produktnummer|part\s*no|bestellnummer|ean|isbn|dokumentnummer|motorbezeichnung|repository)\b/i.test(
      haystack
    )
  ) {
    return true;
  }

  // Username looks like a part/SKU and page is a shop/catalog
  if (
    /^[a-z]?\d{3,}[a-z0-9-]*$/i.test(username) &&
    /\b(shop|catalog|katalog|produkt|ersatzteil|amazon|ebay|aliexpress)\b/i.test(
      haystack
    )
  ) {
    return true;
  }

  // GitHub issue/PR/commit hashes presented as the only "match"
  if (
    /github\.com\/.+\/(issues|pull|commit)\//i.test(input.url) &&
    !input.url.toLowerCase().includes(`/${username}`)
  ) {
    return true;
  }

  return false;
}

function similarUsername(haystack: string, username: string): boolean {
  const u = norm(username);
  if (u.length < 3) return false;
  if (haystack.includes(u)) return false;
  // Prefix/suffix variants
  if (haystack.includes(u.slice(0, Math.max(3, u.length - 2)))) return true;
  if (u.length >= 5 && haystack.includes(u.replace(/[._-]/g, ""))) return true;
  return false;
}

export function confidenceBand(score: number): UsernameConfidenceBand {
  if (score >= 95) return "confirmed";
  if (score >= 80) return "likely";
  if (score >= 60) return "possible";
  return "hidden";
}

export function confidenceLabel(score: number): string {
  const band = confidenceBand(score);
  if (band === "confirmed") return "Bestätigt";
  if (band === "likely") return "Sehr wahrscheinlich";
  if (band === "possible") return "Möglich";
  return "Nicht anzeigen";
}

export interface UsernameHitEvaluation {
  score: number;
  checks: UsernameMatchCheck[];
  isNoise: boolean;
}

/**
 * Weighted identity match for username hits.
 * Tiers: name+username / email+username = 100; username+location = 95;
 * username alone = 70; similar = 40; noise/SKU = 0.
 */
export function evaluateUsernameHit(input: {
  username: string;
  title: string;
  snippet: string;
  url: string;
  identity: IdentityView | null;
}): UsernameHitEvaluation {
  const haystack = norm(
    `${input.title} ${input.snippet} ${input.url} ${input.username}`
  );
  const username = norm(input.username);

  if (isUsernameNoiseHit(input)) {
    return {
      score: 0,
      isNoise: true,
      checks: [
        { label: "Produkt-/Dokumentnummer erkannt", matched: true },
        { label: "Kein Personenbezug", matched: true },
      ],
    };
  }

  const identity = input.identity;
  const first = identity?.personal.firstName?.trim() ?? "";
  const last = identity?.personal.lastName?.trim() ?? "";
  const location = identity?.personal.location?.trim() ?? "";
  const emails = identity?.emails ?? [];

  const usernameExact =
    Boolean(username) &&
    (haystack.includes(username) ||
      input.url.toLowerCase().includes(`/${username}`) ||
      input.url.toLowerCase().includes(`@${username}`));
  const usernameInPath =
    Boolean(username) &&
    (input.url.toLowerCase().includes(`/${username}`) ||
      input.url.toLowerCase().includes(`=${username}`) ||
      input.url.toLowerCase().includes(`@${username}`));
  const firstMatch = Boolean(first && includesToken(haystack, first));
  const lastMatch = Boolean(last && includesToken(haystack, last));
  const fullNameMatch =
    Boolean(first && last) &&
    (includesToken(haystack, `${first} ${last}`) || (firstMatch && lastMatch));
  const locationMatch = Boolean(location && includesToken(haystack, location));
  let emailMatch = false;
  for (const email of emails) {
    const local = email.split("@")[0];
    if (local && includesToken(haystack, local)) {
      emailMatch = true;
      break;
    }
  }
  const interestHints: string[] = [];
  for (const alias of [
    identity?.aliases.publicAlias,
    ...(identity?.aliases.gamingNames ?? []),
  ]) {
    if (alias && includesToken(haystack, alias) && norm(alias) !== username) {
      interestHints.push(alias);
    }
  }

  const checks: UsernameMatchCheck[] = [
    { label: "Benutzername identisch", matched: usernameExact },
    { label: "Profil-URL enthält Benutzername", matched: usernameInPath },
    { label: "Vorname stimmt überein", matched: firstMatch },
    { label: "Nachname stimmt überein", matched: lastMatch },
    { label: "Wohnort erwähnt", matched: locationMatch },
    { label: "E-Mail-Bezug erkannt", matched: emailMatch },
    {
      label: "identische Interessen / Alias",
      matched: interestHints.length > 0,
    },
  ];

  let score = 0;
  if (usernameExact && (fullNameMatch || emailMatch)) score = 100;
  else if (usernameExact && locationMatch) score = 95;
  else if (usernameExact) score = 70;
  else if (similarUsername(haystack, username)) score = 40;
  else score = 0;

  if (usernameInPath && score > 0 && score < 100)
    score = Math.min(100, score + 8);
  if (fullNameMatch && score >= 70) score = Math.min(100, score + 5);

  // Directory noise soft penalty
  if (/namen finden|telefonbuch|wasistmeinname/i.test(haystack) && score > 0) {
    score = Math.max(40, score - 15);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    checks,
    isNoise: false,
  };
}

/**
 * Identity Confidence Score for a username hit (numeric API).
 */
export function scoreUsernameHit(input: {
  username: string;
  title: string;
  snippet: string;
  url: string;
  identity: IdentityView | null;
}): number {
  return evaluateUsernameHit(input).score;
}
