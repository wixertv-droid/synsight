import type { IdentityView } from "@/lib/services/identity-service";

export interface UsernameQueryPlan {
  id: string;
  label: string;
  query: string;
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
  for (const account of identity.socialAccounts ?? []) {
    push(account.username);
  }

  return [...set].slice(0, 3);
}

function quote(username: string): string {
  const safe = username.replace(/"/g, "").trim();
  return `"${safe}"`;
}

/**
 * Build 5–8 high-value SerpAPI queries. No combinatorial explosion.
 * Priority order from Sprint 6E brief; skip duplicates.
 */
export function planUsernameQueries(
  identity: IdentityView | null,
  maxQueries = 8
): { username: string; queries: UsernameQueryPlan[] } {
  const usernames = uniqueUsernames(identity);
  const primary = usernames[0] ?? "";
  if (!primary) {
    return { username: "", queries: [] };
  }

  const q = quote(primary);
  const hasGaming =
    (identity?.aliases.gamingNames.length ?? 0) > 0 ||
    /gamer|xbox|psn|steam|epic/i.test(primary);
  const hasDevSignal =
    Boolean(
      identity?.websites.some((w) => /github|gitlab|code/i.test(w)) ||
      identity?.domains.some((d) => /github|gitlab/i.test(d))
    ) || /dev|code|git/i.test(primary);

  const candidates: UsernameQueryPlan[] = [
    { id: "exact", label: "Username exact", query: q },
    { id: "profile", label: "Username profile", query: `${q} profile` },
    { id: "forum", label: "Username forum", query: `${q} forum` },
    { id: "social", label: "Username social", query: `${q} social` },
  ];

  if (hasGaming || candidates.length < 6) {
    candidates.push({
      id: "gaming",
      label: "Username gaming",
      query: `${q} gaming`,
    });
  }

  if (hasDevSignal || candidates.length < 7) {
    candidates.push({
      id: "github",
      label: "Username github",
      query: `${q} github`,
    });
  }

  candidates.push({
    id: "reddit",
    label: "Username reddit",
    query: `${q} reddit`,
  });

  // Secondary username only if room and clearly distinct
  const secondary = usernames[1];
  if (secondary && secondary.toLowerCase() !== primary.toLowerCase()) {
    candidates.push({
      id: "alias2",
      label: "Secondary username",
      query: quote(secondary),
    });
  }

  const capped = Math.min(8, Math.max(5, maxQueries));
  const seen = new Set<string>();
  const queries: UsernameQueryPlan[] = [];
  for (const plan of candidates) {
    const key = plan.query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push(plan);
    if (queries.length >= capped) break;
  }

  return { username: primary, queries };
}
