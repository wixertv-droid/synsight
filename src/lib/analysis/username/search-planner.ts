import type { IdentityView } from "@/lib/services/identity-service";

export interface UsernameQueryPlan {
  id: string;
  label: string;
  query: string;
  /** Which identity username this query targets */
  username: string;
}

function uniqueUsernames(identity: IdentityView | null): string[] {
  if (!identity) return [];
  const set = new Set<string>();
  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    if (trimmed.length < 2 || trimmed.length > 64) return;
    if (/\s/.test(trimmed) && !trimmed.includes("_")) return;
    set.add(trimmed);
  };

  push(identity.aliases.publicAlias);
  for (const name of identity.aliases.usernames) push(name);
  for (const name of identity.aliases.gamingNames) push(name);
  for (const name of identity.aliases.nicknames ?? []) push(name);
  for (const name of identity.aliases.formerNames ?? []) {
    // former display names often have spaces — only keep handle-like ones
    if (name && !/\s/.test(name)) push(name);
  }
  for (const account of identity.socialAccounts ?? []) {
    push(account.username);
  }

  return [...set].slice(0, 12);
}

function quote(username: string): string {
  const safe = username.replace(/"/g, "").trim();
  return `"${safe}"`;
}

/**
 * Build SerpAPI queries across ALL identity usernames (merged later).
 * Budget: exact query per username first, then category queries for primary.
 */
export function planUsernameQueries(
  identity: IdentityView | null,
  maxQueries = 8
): { username: string; usernames: string[]; queries: UsernameQueryPlan[] } {
  const usernames = uniqueUsernames(identity);
  const primary = usernames[0] ?? "";
  if (!primary) {
    return { username: "", usernames: [], queries: [] };
  }

  const capped = Math.min(12, Math.max(5, maxQueries));
  const candidates: UsernameQueryPlan[] = [];

  // 1) Exact match for every stored username / alias
  for (const [index, handle] of usernames.entries()) {
    candidates.push({
      id: `exact-${index}`,
      label: `Exact · ${handle}`,
      query: quote(handle),
      username: handle,
    });
  }

  // 2) Category deepening for the primary handle (and secondary if budget)
  const deepen = (handle: string, prefix: string) => {
    const q = quote(handle);
    candidates.push(
      {
        id: `${prefix}-profile`,
        label: `Profile · ${handle}`,
        query: `${q} profile`,
        username: handle,
      },
      {
        id: `${prefix}-forum`,
        label: `Forum · ${handle}`,
        query: `${q} forum`,
        username: handle,
      },
      {
        id: `${prefix}-social`,
        label: `Social · ${handle}`,
        query: `${q} social`,
        username: handle,
      }
    );
  };

  deepen(primary, "p0");
  if (usernames[1]) deepen(usernames[1], "p1");

  const hasGaming = (identity?.aliases.gamingNames.length ?? 0) > 0;
  if (hasGaming) {
    const gamer = identity!.aliases.gamingNames[0]!;
    candidates.push({
      id: "gaming",
      label: `Gaming · ${gamer}`,
      query: `${quote(gamer)} gaming`,
      username: gamer,
    });
  }

  candidates.push({
    id: "github-primary",
    label: `GitHub · ${primary}`,
    query: `${quote(primary)} github`,
    username: primary,
  });

  const seen = new Set<string>();
  const queries: UsernameQueryPlan[] = [];
  for (const plan of candidates) {
    const key = plan.query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push(plan);
    if (queries.length >= capped) break;
  }

  return { username: primary, usernames, queries };
}
