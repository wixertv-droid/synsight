import type { IdentityView } from "@/lib/services/identity-service";
import type { UsernameConfidenceBand } from "@/lib/analysis/username/types";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function includesToken(haystack: string, token: string): boolean {
  const t = norm(token);
  if (t.length < 2) return false;
  return haystack.includes(t);
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

/**
 * Identity Confidence Score for a username hit.
 * Uses username/alias/name/location/company/email signals from identity.
 */
export function scoreUsernameHit(input: {
  username: string;
  title: string;
  snippet: string;
  url: string;
  identity: IdentityView | null;
}): number {
  const haystack = norm(
    `${input.title} ${input.snippet} ${input.url} ${input.username}`
  );
  let score = 48;

  const username = norm(input.username);
  if (username && haystack.includes(username)) {
    score += 28;
    // Exact profile path boost
    if (
      input.url.toLowerCase().includes(`/${username}`) ||
      input.url.toLowerCase().includes(`=${username}`) ||
      input.url.toLowerCase().includes(`@${username}`)
    ) {
      score += 12;
    }
  }

  const identity = input.identity;
  if (identity) {
    const first = identity.personal.firstName?.trim();
    const last = identity.personal.lastName?.trim();
    if (first && includesToken(haystack, first)) score += 6;
    if (last && includesToken(haystack, last)) score += 8;
    if (first && last && includesToken(haystack, `${first} ${last}`)) {
      score += 6;
    }

    const location = identity.personal.location;
    if (location && includesToken(haystack, location)) score += 5;

    const company = identity.personal.company;
    if (company && includesToken(haystack, company)) score += 5;

    for (const email of identity.emails ?? []) {
      const local = email.split("@")[0];
      if (local && includesToken(haystack, local)) {
        score += 4;
        break;
      }
    }

    for (const alias of [
      identity.aliases.publicAlias,
      ...identity.aliases.usernames,
      ...identity.aliases.gamingNames,
    ]) {
      if (alias && norm(alias) !== username && includesToken(haystack, alias)) {
        score += 4;
        break;
      }
    }
  }

  // Weak generic directory noise
  if (/namen finden|telefonbuch|wasistmeinname/i.test(haystack)) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
