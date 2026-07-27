import type { IdentityView } from "@/lib/services/identity-service";

export type ReverseImageQueryGroup = "name" | "alias" | "username";

export interface ReverseImageQueryPlan {
  id: string;
  label: string;
  query: string;
  group: ReverseImageQueryGroup;
  /** Extra SerpAPI pages for high-recall queries (usernames). */
  pages?: number;
}

/** Adult-/Nischen-Sites — analog manueller Google-Bildsuche (SafeSearch aus). */
const ADULT_IMAGE_DORK =
  '(site:joyclub.de OR site:einfachgeiler.com OR site:amarotic.com OR site:onlyfans.com OR site:frivol.com OR site:amateurseite.com OR site:ffgv.de OR "amateur" OR "escort")';

const USERNAME_FOCUS_SITES = [
  "amarotic.com",
  "frivol.com",
  "amateurseite.com",
  "ffgv.de",
  "einfachgeiler.com",
  "joyclub.de",
] as const;

function quote(value: string): string {
  const safe = value.replace(/"/g, "").trim();
  return `"${safe}"`;
}

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
 * Phase 1 queries.
 * WICHTIG: Jeder Benutzername einzeln und ZUERST (kein OR-Batch — Google Images
 * liefert bei `"a" OR "b"` oft 0 Treffer). SafeSearch bleibt off in SerpAPI.
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
    pages?: number
  ) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || seenQueries.has(normalized)) return;
    seenQueries.add(normalized);
    plans.push({
      id,
      label,
      query: query.trim(),
      group,
      ...(pages ? { pages } : {}),
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

  // 1) Benutzernamen zuerst — höchste Trefferquote bei Adult/OSINT.
  for (const [index, username] of usernames.entries()) {
    addPlan(
      `username-open-${index}`,
      `Benutzername · ${username}`,
      username,
      "username",
      5
    );
    addPlan(
      `username-exact-${index}`,
      `Benutzername exakt · ${username}`,
      quote(username),
      "username",
      3
    );
    addPlan(
      `username-adult-${index}`,
      `Benutzername Adult · ${username}`,
      `${username} ${ADULT_IMAGE_DORK}`,
      "username",
      4
    );
    for (const [siteIndex, site] of USERNAME_FOCUS_SITES.entries()) {
      addPlan(
        `username-site-${index}-${siteIndex}`,
        `Benutzername · ${site} · ${username}`,
        `site:${site} ${username}`,
        "username",
        2
      );
    }
  }

  // 2) Alias
  for (const [index, alias] of aliases.entries()) {
    addPlan(`alias-open-${index}`, `Alias · ${alias}`, alias, "alias", 4);
    addPlan(
      `alias-exact-${index}`,
      `Alias exakt · ${alias}`,
      quote(alias),
      "alias",
      2
    );
    addPlan(
      `alias-adult-${index}`,
      `Alias Adult · ${alias}`,
      `${alias} ${ADULT_IMAGE_DORK}`,
      "alias",
      3
    );
  }

  // 3) Vollständiger Name
  if (fullName) {
    addPlan("name-open", `Name · ${fullName}`, fullName, "name", 4);
    addPlan(
      "name-exact",
      `Name exakt · ${fullName}`,
      quote(fullName),
      "name",
      3
    );
    addPlan(
      "name-photo",
      `Name + Foto · ${fullName}`,
      `${fullName} (photo OR foto OR bild OR gallery)`,
      "name",
      4
    );
    addPlan(
      "name-adult",
      `Name Adult · ${fullName}`,
      `${fullName} ${ADULT_IMAGE_DORK}`,
      "name",
      3
    );
  }

  return plans;
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
