import type { IdentityView } from "@/lib/services/identity-service";
import type { ReverseImageQueryGroup } from "@/lib/analysis/reverse-image/search-planner";

export interface ScoredSearchTerm {
  value: string;
  group: ReverseImageQueryGroup;
  /** 0–100 — höhere Scores zuerst */
  priority: number;
  reason: string;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function looksLikeUsername(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  return /[0-9._\-]/.test(v) || (v.length >= 4 && v.length <= 32);
}

function scoreIdentitySignal(
  value: string,
  kind: "name" | "alias" | "username"
) {
  const v = value.trim();
  const compact = v.replace(/\s+/g, "");
  const digits = (compact.match(/\d/g) ?? []).length;
  const letters = (compact.match(/[a-zA-ZäöüÄÖÜß]/g) ?? []).length;
  const digitRatio = compact.length > 0 ? digits / compact.length : 1;
  const hasSpaces = /\s/.test(v);
  const hasOnlyDigits = /^\d+$/.test(compact);
  const looksTechnical =
    /^[A-Z]{2,}\d{4,}$/.test(compact) ||
    /^(?=.*\d)[A-Z0-9-]{10,}$/i.test(compact) ||
    /^(sku|vin|id|ref|sn|artikel|prod)/i.test(compact);
  const dictionaryLike = /^[a-zäöüß]{3,12}$/i.test(compact) && !hasSpaces;

  let score = kind === "username" ? 92 : kind === "alias" ? 86 : 76;
  if (hasSpaces && kind === "name") score += 8;
  if (letters >= 6) score += 4;
  if (compact.length >= 5 && compact.length <= 18) score += 5;
  if (compact.length <= 3) score -= 28;
  if (compact.length >= 22) score -= 22;
  if (digitRatio > 0.55) score -= 35;
  else if (digitRatio > 0.3) score -= 16;
  else if (digits > 0 && kind === "username") score += 3;
  if (hasOnlyDigits) score = 0;
  if (looksTechnical) score -= 48;
  if (dictionaryLike && kind === "username") score -= 10;
  if (/[_\-.]/.test(compact) && kind === "username") score += 2;
  if (/\b(gmbh|ag|kg|shop|auto|teile|ersatz|produkt|manual|pdf)\b/i.test(v)) {
    score -= 45;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreUsername(value: string): { priority: number; reason: string } {
  const priority = scoreIdentitySignal(value, "username");
  return {
    priority,
    reason:
      priority >= 80
        ? "Hochwertiger Benutzername"
        : priority >= 55
          ? "Möglicher Benutzername"
          : "Schwacher/technischer Benutzername",
  };
}

function scoreAlias(value: string): { priority: number; reason: string } {
  const v = value.trim();
  if (looksLikeUsername(v)) {
    const scored = scoreUsername(v);
    return {
      priority: Math.max(0, Math.min(98, scored.priority - 2)),
      reason: "Alias / Handle",
    };
  }
  const priority = scoreIdentitySignal(v, "alias");
  if (/\s/.test(v)) return { priority, reason: "Alias mit Personenbezug" };
  return { priority, reason: "Alias" };
}

function scoreFullName(
  first: string,
  last: string
): {
  priority: number;
  reason: string;
} {
  if (first && last) {
    return {
      priority: scoreIdentitySignal(`${first} ${last}`, "name"),
      reason: "Vor- und Nachname",
    };
  }
  if (last) return { priority: 55, reason: "Nur Nachname" };
  if (first) return { priority: 20, reason: "Nur Vorname (schwach)" };
  return { priority: 0, reason: "leer" };
}

/**
 * Identity Builder: priorisierte Suchbegriffe aus dem Profil.
 * Stärkste Identifikatoren zuerst (Usernames ≫ Alias ≫ voller Name ≫ Vorname).
 */
export function buildPrioritizedSearchTerms(
  identity: IdentityView | null,
  options?: { identityScoreThreshold?: number }
): ScoredSearchTerm[] {
  if (!identity) return [];

  const first = identity.personal.firstName?.trim() ?? "";
  const last = identity.personal.lastName?.trim() ?? "";
  const fullName = first && last ? `${first} ${last}` : first || last || "";
  const fullKey = fullName ? normalizeKey(fullName) : "";

  const terms: ScoredSearchTerm[] = [];
  const seen = new Set<string>();

  const threshold = Math.max(0, options?.identityScoreThreshold ?? 45);
  const push = (
    value: string,
    group: ReverseImageQueryGroup,
    scored: { priority: number; reason: string }
  ) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 64) return;
    if (scored.priority < threshold) return;
    const key = normalizeKey(trimmed);
    if (seen.has(key)) return;
    if (fullKey && key === fullKey && group !== "name") return;
    seen.add(key);
    terms.push({
      value: trimmed,
      group,
      priority: scored.priority,
      reason: scored.reason,
    });
  };

  for (const username of identity.aliases.usernames ?? []) {
    push(username, "username", scoreUsername(username));
  }
  for (const account of identity.socialAccounts ?? []) {
    if (account.username) {
      push(account.username, "username", scoreUsername(account.username));
    }
  }

  const aliasPool = [
    identity.aliases.publicAlias,
    ...(identity.aliases.gamingNames ?? []),
    ...(identity.aliases.formerNames ?? []),
    ...(identity.aliases.nicknames ?? []),
  ];
  for (const alias of aliasPool) {
    if (!alias?.trim()) continue;
    push(alias, "alias", scoreAlias(alias));
  }

  if (fullName) {
    push(fullName, "name", scoreFullName(first, last));
  } else if (first) {
    push(first, "name", { priority: 20, reason: "Nur Vorname (schwach)" });
  } else if (last) {
    push(last, "name", { priority: 55, reason: "Nur Nachname" });
  }

  const socialBases = [
    fullName,
    identity.aliases.publicAlias,
    ...(identity.aliases.formerNames ?? []),
    ...(identity.aliases.nicknames ?? []),
  ].filter((value): value is string => Boolean(value?.trim()));
  const socialDomains = [
    "site:facebook.com",
    "site:instagram.com",
    "site:linkedin.com",
    "site:tiktok.com",
    "site:pinterest.com",
    "site:youtube.com",
    "site:x.com",
  ];
  for (const base of socialBases.slice(0, 2)) {
    const baseScore = scoreIdentitySignal(
      base,
      /\s/.test(base) ? "name" : "alias"
    );
    if (baseScore < 65) continue;
    for (const domain of socialDomains) {
      push(`${domain} "${base.trim()}"`, "social", {
        priority: Math.max(50, Math.min(95, baseScore - 6)),
        reason: `Social-Media-Suche zu ${base.trim()}`,
      });
    }
  }

  return terms.sort(
    (a, b) => b.priority - a.priority || a.value.localeCompare(b.value)
  );
}

/** Max. SerpAPI-Seiten-Obergrenze je nach Priorität (adaptiv darunter). */
export function maxPagesForPriority(priority: number): number {
  if (priority >= 90) return 2;
  if (priority >= 70) return 2;
  if (priority >= 40) return 1;
  return 0; // zu schwach — nicht suchen
}
