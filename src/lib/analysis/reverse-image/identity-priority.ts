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

function scoreUsername(value: string): { priority: number; reason: string } {
  const v = value.trim();
  let priority = 92;
  if (/[0-9]/.test(v)) priority += 4;
  if (/[._\-]/.test(v)) priority += 2;
  if (v.length >= 6) priority += 2;
  if (v.length <= 3) priority = Math.min(priority, 55);
  return {
    priority: Math.min(100, priority),
    reason: "Benutzername (starker Identifikator)",
  };
}

function scoreAlias(value: string): { priority: number; reason: string } {
  const v = value.trim();
  if (looksLikeUsername(v)) {
    const scored = scoreUsername(v);
    return {
      priority: Math.min(98, scored.priority - 2),
      reason: "Alias / Handle",
    };
  }
  if (/\s/.test(v)) {
    return { priority: 88, reason: "Alias mit Leerzeichen" };
  }
  return { priority: 90, reason: "Alias" };
}

function scoreFullName(
  first: string,
  last: string
): {
  priority: number;
  reason: string;
} {
  if (first && last) {
    return { priority: 90, reason: "Vor- und Nachname" };
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
  identity: IdentityView | null
): ScoredSearchTerm[] {
  if (!identity) return [];

  const first = identity.personal.firstName?.trim() ?? "";
  const last = identity.personal.lastName?.trim() ?? "";
  const fullName = first && last ? `${first} ${last}` : first || last || "";
  const fullKey = fullName ? normalizeKey(fullName) : "";

  const terms: ScoredSearchTerm[] = [];
  const seen = new Set<string>();

  const push = (
    value: string,
    group: ReverseImageQueryGroup,
    scored: { priority: number; reason: string }
  ) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 64) return;
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

  return terms.sort(
    (a, b) => b.priority - a.priority || a.value.localeCompare(b.value)
  );
}

/** Max. SerpAPI-Seiten-Obergrenze je nach Priorität (adaptiv darunter). */
export function maxPagesForPriority(priority: number): number {
  if (priority >= 95) return 4;
  if (priority >= 90) return 3;
  if (priority >= 70) return 2;
  if (priority >= 40) return 1;
  return 0; // zu schwach — nicht suchen
}
