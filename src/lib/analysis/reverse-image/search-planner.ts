import type { IdentityView } from "@/lib/services/identity-service";
import { resolveSubjectName } from "@/lib/analysis/google/queries";

export interface ReverseImageQueryPlan {
  id: string;
  label: string;
  query: string;
}

function quote(value: string): string {
  const safe = value.replace(/"/g, "").trim();
  return `"${safe}"`;
}

function collectUsernames(identity: IdentityView | null): string[] {
  if (!identity) return [];
  const set = new Set<string>();
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 64) return;
    set.add(trimmed);
  };
  push(identity.aliases.publicAlias);
  for (const name of identity.aliases.usernames) push(name);
  for (const name of identity.aliases.gamingNames) push(name);
  for (const name of identity.aliases.nicknames ?? []) push(name);
  for (const account of identity.socialAccounts ?? []) push(account.username);
  return [...set].slice(0, 6);
}

/**
 * Build Google Images text queries from identity — public index only.
 */
export function planReverseImageQueries(
  identity: IdentityView | null,
  maxQueries = 4
): ReverseImageQueryPlan[] {
  const plans: ReverseImageQueryPlan[] = [];
  const subject = resolveSubjectName(identity);
  const usernames = collectUsernames(identity);

  if (subject && subject !== "Unbekannt") {
    plans.push({
      id: "name",
      label: `Name · ${subject}`,
      query: quote(subject),
    });
    plans.push({
      id: "name-photo",
      label: `Name + Foto · ${subject}`,
      query: `${quote(subject)} foto`,
    });
  }

  for (const [index, handle] of usernames.entries()) {
    if (plans.length >= maxQueries) break;
    plans.push({
      id: `username-${index}`,
      label: `Username · ${handle}`,
      query: quote(handle),
    });
  }

  return plans.slice(0, maxQueries);
}
