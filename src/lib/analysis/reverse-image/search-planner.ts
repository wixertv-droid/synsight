import type { IdentityView } from "@/lib/services/identity-service";

export interface ReverseImageQueryPlan {
  id: string;
  label: string;
  query: string;
}

/** Handles pro SerpAPI-Call (OR-verknüpft) — spart Kosten bei vielen Aliasen. */
export const REVERSE_IMAGE_HANDLES_PER_QUERY = 4;

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

/**
 * Sammelt alle Alias-/Username-Varianten aus dem Profil (dedupliziert).
 */
export function collectReverseImageHandles(
  identity: IdentityView | null,
  options?: { excludeFullName?: string | null }
): string[] {
  if (!identity) return [];

  const exclude = options?.excludeFullName
    ? normalizeKey(options.excludeFullName)
    : null;
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 64) return;
    const key = normalizeKey(trimmed);
    if (exclude && key === exclude) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  push(identity.aliases.publicAlias);
  for (const name of identity.aliases.usernames) push(name);
  for (const name of identity.aliases.gamingNames) push(name);
  for (const name of identity.aliases.nicknames ?? []) push(name);
  for (const name of identity.aliases.formerNames) push(name);
  for (const account of identity.socialAccounts ?? []) push(account.username);

  return out;
}

function buildOrQuery(handles: string[]): string {
  return handles.map((handle) => quote(handle)).join(" OR ");
}

/**
 * Plan SerpAPI Google-Images-Queries aus dem Identitätsprofil.
 *
 * Kosteneffizienz:
 * - Vollständiger Name (alle Vornamen + Nachname) als 1–2 Queries
 * - Frühere Namen einzeln (wenn abweichend)
 * - Alle Alias/Usernames in OR-Batches à 4 → weniger SerpAPI-Calls
 */
export function planReverseImageQueries(
  identity: IdentityView | null,
  options?: {
    handlesPerQuery?: number;
  }
): ReverseImageQueryPlan[] {
  const plans: ReverseImageQueryPlan[] = [];
  const seenQueries = new Set<string>();
  const batchSize = Math.max(
    1,
    options?.handlesPerQuery ?? REVERSE_IMAGE_HANDLES_PER_QUERY
  );

  const addPlan = (id: string, label: string, query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || seenQueries.has(normalized)) return;
    seenQueries.add(normalized);
    plans.push({ id, label, query: query.trim() });
  };

  const fullName = buildFullName(identity);
  if (fullName) {
    addPlan("name-full", `Name · ${fullName}`, quote(fullName));
    addPlan(
      "name-full-photo",
      `Name + Foto · ${fullName}`,
      `${quote(fullName)} foto`
    );
  }

  const formerNames = identity?.aliases.formerNames ?? [];
  for (const [index, former] of formerNames.entries()) {
    const trimmed = former.trim();
    if (trimmed.length < 2) continue;
    if (fullName && normalizeKey(trimmed) === normalizeKey(fullName)) continue;
    addPlan(`former-${index}`, `Früherer Name · ${trimmed}`, quote(trimmed));
  }

  const handles = collectReverseImageHandles(identity, {
    excludeFullName: fullName,
  });

  for (let offset = 0; offset < handles.length; offset += batchSize) {
    const batch = handles.slice(offset, offset + batchSize);
    const batchIndex = Math.floor(offset / batchSize);
    const query = batch.length === 1 ? quote(batch[0]) : buildOrQuery(batch);
    addPlan(
      `handles-${batchIndex}`,
      batch.length === 1
        ? `Alias · ${batch[0]}`
        : `Alias · ${batch.join(" · ")}`,
      query
    );
  }

  return plans;
}

export function resolveReverseImageSubjectName(
  identity: IdentityView | null
): string {
  return buildFullName(identity) ?? "Unbekannt";
}
