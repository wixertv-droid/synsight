import type { IdentityView } from "@/lib/services/identity-service";
import type { IntelligenceQueryPlan } from "@/lib/analysis/types";
import { buildIdentityFingerprint } from "@/lib/analysis/osint/identity-fingerprint";

export interface ScoredSearchPlan extends IntelligenceQueryPlan {
  searchScore: number;
}

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * Phase 2 — SearchPlanner mit Search Score.
 * Max. 5 Queries, sortiert nach Priorität, nur vorhandene Daten.
 *
 * Scores: Telefon 100 · Mail 95 · Name+Ort 90 · Name+Firma 80 · Alias 70 · Domain 65
 */
export function planGoogleSearches(
  identity: IdentityView | null
): IntelligenceQueryPlan[] {
  return planScoredGoogleSearches(identity).map((plan) => ({
    id: plan.id,
    label: plan.label,
    query: plan.query,
    help: plan.help,
  }));
}

export function planScoredGoogleSearches(
  identity: IdentityView | null
): ScoredSearchPlan[] {
  const fp = buildIdentityFingerprint(identity);
  const fullName =
    fp.firstName && fp.lastName
      ? `${fp.firstName} ${fp.lastName}`
      : fp.subjectName !== "Unbekannt"
        ? fp.subjectName
        : "";
  const candidates: ScoredSearchPlan[] = [];
  const seen = new Set<string>();

  function push(plan: ScoredSearchPlan) {
    const key = plan.query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    candidates.push(plan);
  }

  if (fp.phones[0]) {
    push({
      id: "q-phone",
      label: "Telefon",
      query: `"${fp.phones[0]}"`,
      help: "Search Score 100 — Telefonnummer aus dem Profil.",
      searchScore: 100,
    });
  }
  if (fp.emails[0]) {
    push({
      id: "q-email",
      label: "E-Mail",
      query: `"${fp.emails[0]}"`,
      help: "Search Score 95 — E-Mail aus dem Profil.",
      searchScore: 95,
    });
  }
  if (fullName && fp.location) {
    push({
      id: "q-name-location",
      label: "Name + Wohnort",
      query: `"${fullName}" ${fp.location}`,
      help: "Search Score 90 — Name mit Wohnort.",
      searchScore: 90,
    });
  } else if (fullName) {
    push({
      id: "q-name",
      label: "Name",
      query: `"${fullName}"`,
      help: "Search Score 85 — Name ohne Wohnort.",
      searchScore: 85,
    });
  }
  if (fullName && fp.company) {
    push({
      id: "q-name-company",
      label: "Name + Firma",
      query: `"${fullName}" "${fp.company}"`,
      help: "Search Score 80 — Name mit Firma.",
      searchScore: 80,
    });
  }
  if (fp.aliases[0]) {
    push({
      id: "q-alias",
      label: "Alias",
      query: `"${fp.aliases[0]}"`,
      help: "Search Score 70 — Alias / Benutzername.",
      searchScore: 70,
    });
  }
  if (fp.domains[0] && fullName) {
    push({
      id: "q-domain",
      label: "Domain",
      query: `site:${fp.domains[0]} "${fullName}"`,
      help: "Search Score 65 — Domain aus dem Profil.",
      searchScore: 65,
    });
  }

  return candidates.sort((a, b) => b.searchScore - a.searchScore).slice(0, 5);
}

export function normalizeSearchCacheKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

/** @deprecated use planGoogleSearches — kept for identity helpers */
export function resolvePlannerIdentity(identity: IdentityView | null) {
  return {
    first: clean(identity?.personal.firstName),
    last: clean(identity?.personal.lastName),
  };
}
