import type { IdentityView } from "@/lib/services/identity-service";

export type ReverseImageQueryGroup = "name" | "alias" | "username";

export interface ReverseImageQueryPlan {
  id: string;
  label: string;
  query: string;
  group: ReverseImageQueryGroup;
}

/** Adult-/Nischen-Sites — analog zur Google-Textsuche (safeSearch=Off). */
const ADULT_IMAGE_DORK =
  '(site:joyclub.de OR site:einfachgeiler.com OR site:amarotic.com OR site:onlyfans.com OR "amateur" OR "escort")';

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
 * Phase 1 queries — getrennt nach Name, Alias, Benutzername (je eigener Filter-Tab).
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
    group: ReverseImageQueryGroup
  ) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || seenQueries.has(normalized)) return;
    seenQueries.add(normalized);
    plans.push({ id, label, query: query.trim(), group });
  };

  const fullName = buildFullName(identity);
  if (fullName) {
    addPlan("name-full", `Name · ${fullName}`, quote(fullName), "name");
    addPlan(
      "name-full-photo",
      `Name + Foto · ${fullName}`,
      `${quote(fullName)} foto`,
      "name"
    );
  }

  for (const [index, alias] of collectAliases(identity).entries()) {
    if (fullName && normalizeKey(alias) === normalizeKey(fullName)) continue;
    addPlan(`alias-${index}`, `Alias · ${alias}`, quote(alias), "alias");
    addPlan(
      `alias-adult-${index}`,
      `Alias Adult · ${alias}`,
      `${quote(alias)} ${ADULT_IMAGE_DORK}`,
      "alias"
    );
  }

  for (const [index, username] of collectUsernames(identity).entries()) {
    if (fullName && normalizeKey(username) === normalizeKey(fullName)) continue;
    addPlan(
      `username-${index}`,
      `Benutzername · ${username}`,
      quote(username),
      "username"
    );
    addPlan(
      `username-adult-${index}`,
      `Benutzername Adult · ${username}`,
      `${quote(username)} ${ADULT_IMAGE_DORK}`,
      "username"
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
