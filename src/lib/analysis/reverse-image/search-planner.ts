import type { IdentityView } from "@/lib/services/identity-service";

export type ReverseImageQueryGroup = "name" | "alias" | "username";

export interface ReverseImageQueryPlan {
  id: string;
  label: string;
  query: string;
  group: ReverseImageQueryGroup;
  /** SerpAPI `ijn` pages (1 Call ≈ 1 Seite ≈ bis ~100 Bilder). Kosten skalieren linear. */
  pages?: number;
}

/**
 * Seiten pro Query. Jede Seite = 1 SerpAPI-Request.
 * Username etwas tiefer (Recall), Name/Alias sparsam.
 */
export const REVERSE_IMAGE_COST_PAGES = {
  username: 3,
  alias: 2,
  name: 2,
} as const;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function buildFullName(identity: IdentityView | null): string | null {
  const first = identity?.personal.firstName?.trim() ?? "";
  const last = identity?.personal.lastName?.trim() ?? "";
  if (first && last) return `${first} ${last}`;
  return first || last || null;
}

function collectAliases(identity: IdentityView | null): string[] {
  if (!identity) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 64) return;
    const key = normalizeKey(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  push(identity.aliases.publicAlias);
  for (const name of identity.aliases.gamingNames) push(name);
  for (const name of identity.aliases.formerNames) push(name);
  for (const name of identity.aliases.nicknames ?? []) push(name);
  return out;
}

function collectUsernames(identity: IdentityView | null): string[] {
  if (!identity) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 64) return;
    const key = normalizeKey(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  for (const name of identity.aliases.usernames) push(name);
  for (const account of identity.socialAccounts ?? []) push(account.username);
  return out;
}

/**
 * Phase-1-Plan ohne Extra-Adult-Queries.
 *
 * Pro Benutzername: 1 offene Query (wie manuelles Google) — kein Adult-Dork,
 * kein OR über Usernames, keine Einzelsite-Calls.
 * Pro Alias: 1 offene Query.
 * Pro Name: 2 Queries (offen + Foto).
 *
 * Beispiel Anja1921 + Luder-Anja + Name:
 * 2 + 2 = 4 Queries × Seiten ≈ 10 SerpAPI-Calls (3+3+2+2).
 * Mehr Seiten = mehr Bilder = mehr SerpAPI-Kosten (1 Seite ≈ 1 Call ≈ ~100 Bilder).
 */
export function planReverseImageQueries(
  identity: IdentityView | null
): ReverseImageQueryPlan[] {
  const plans: ReverseImageQueryPlan[] = [];
  const seenQueries = new Set<string>();

  const addPlan = (
    id: string,
    label: string,
    query: string,
    group: ReverseImageQueryGroup,
    pages: number
  ) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || seenQueries.has(normalized)) return;
    seenQueries.add(normalized);
    plans.push({
      id,
      label,
      query: query.trim(),
      group,
      pages,
    });
  };

  const fullName = buildFullName(identity);
  const usernames = collectUsernames(identity).filter(
    (username) =>
      !(fullName && normalizeKey(username) === normalizeKey(fullName))
  );
  const aliases = collectAliases(identity).filter(
    (alias) => !(fullName && normalizeKey(alias) === normalizeKey(fullName))
  );

  // 1) Benutzernamen — nur offene Suche (Adult-Extra-Queries entfallen)
  for (const [index, username] of usernames.entries()) {
    addPlan(
      `username-open-${index}`,
      `Benutzername · ${username}`,
      username,
      "username",
      REVERSE_IMAGE_COST_PAGES.username
    );
  }

  // 2) Alias
  for (const [index, alias] of aliases.entries()) {
    addPlan(
      `alias-open-${index}`,
      `Alias · ${alias}`,
      alias,
      "alias",
      REVERSE_IMAGE_COST_PAGES.alias
    );
  }

  // 3) Vollständiger Name — offen + Foto
  if (fullName) {
    addPlan(
      "name-open",
      `Name · ${fullName}`,
      fullName,
      "name",
      REVERSE_IMAGE_COST_PAGES.name
    );
    addPlan(
      "name-photo",
      `Name + Foto · ${fullName}`,
      `${fullName} (photo OR foto OR bild)`,
      "name",
      REVERSE_IMAGE_COST_PAGES.name
    );
  }

  return plans;
}

/** Geschätzte SerpAPI-Seiten-Calls für einen Plan (Kostenindikator). */
export function estimateSerpApiPageCalls(
  plans: ReverseImageQueryPlan[]
): number {
  return plans.reduce(
    (sum, plan) => sum + (plan.pages ?? REVERSE_IMAGE_COST_PAGES.username),
    0
  );
}

export function resolveReverseImageSubjectName(
  identity: IdentityView | null
): string {
  return buildFullName(identity) ?? "Unbekannt";
}

/** @deprecated use collectAliases / collectUsernames */
export function collectReverseImageHandles(
  identity: IdentityView | null
): string[] {
  return [...collectAliases(identity), ...collectUsernames(identity)];
}
