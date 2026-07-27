import type { IdentityView } from "@/lib/services/identity-service";

export type ReverseImageQueryGroup = "name" | "alias" | "username";

export interface ReverseImageQueryPlan {
  id: string;
  label: string;
  query: string;
  group: ReverseImageQueryGroup;
  /** SerpAPI `ijn` pages (1 Call ≈ 1 Seite). Keep low — costs scale linearly. */
  pages?: number;
}

/**
 * Eine Adult-/Nischen-Query statt 6× site:-Einzelsuchen.
 * Spart SerpAPI-Calls, deckt dieselben Plattformen ab.
 */
const ADULT_IMAGE_DORK =
  '(site:amarotic.com OR site:frivol.com OR site:amateurseite.com OR site:joyclub.de OR site:einfachgeiler.com OR site:ffgv.de OR site:onlyfans.com OR "amateur")';

/** Max. Seiten pro Query (jede Seite = 1 SerpAPI-Request). */
export const REVERSE_IMAGE_COST_PAGES = {
  username: 2,
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
 * Kosteneffizienter Phase-1-Plan.
 *
 * Pro Benutzername: 2 Queries (offen + Adult-Bundle) — kein OR über Usernames,
 * keine 6 Einzelsite-Calls, keine redundanten „exakt“-Queries.
 * Pro Alias: 1 offene Query.
 * Pro Name: 2 Queries (offen + Foto).
 *
 * Beispiel Anja1921 + Luder-Anja + Name:
 * 2×2 + 2 = 6 Queries × 2 Seiten ≈ 12 SerpAPI-Calls (vorher oft 80–100+).
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

  // 1) Benutzernamen zuerst — offen (wie manuelles Google) + eine Adult-Bundle-Query
  for (const [index, username] of usernames.entries()) {
    addPlan(
      `username-open-${index}`,
      `Benutzername · ${username}`,
      username,
      "username",
      REVERSE_IMAGE_COST_PAGES.username
    );
    addPlan(
      `username-adult-${index}`,
      `Benutzername Adult · ${username}`,
      `${username} ${ADULT_IMAGE_DORK}`,
      "username",
      REVERSE_IMAGE_COST_PAGES.username
    );
  }

  // 2) Alias — eine offene Query reicht (Adult steckt bei Usernames)
  for (const [index, alias] of aliases.entries()) {
    addPlan(
      `alias-open-${index}`,
      `Alias · ${alias}`,
      alias,
      "alias",
      REVERSE_IMAGE_COST_PAGES.alias
    );
  }

  // 3) Vollständiger Name — offen + Foto (kein Extra-Adult/Exakt)
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
  return plans.reduce((sum, plan) => sum + (plan.pages ?? 2), 0);
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
