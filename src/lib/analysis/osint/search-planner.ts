import type { IdentityView } from "@/lib/services/identity-service";
import type {
  IntelligenceQueryPlan,
  SerpSearchEngine,
} from "@/lib/analysis/types";
import { buildIdentityFingerprint } from "@/lib/analysis/osint/identity-fingerprint";

export interface ScoredSearchPlan extends IntelligenceQueryPlan {
  searchScore: number;
  engine: SerpSearchEngine;
}

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * Phase 2 — Hybrid SearchPlanner (Google + Bing) mit Search Score.
 * Max. 5 Queries, sortiert nach Priorität, nur vorhandene Daten.
 *
 * Google (safe=off): Telefon 100 · Mail 95 · Name+Ort 90 · Name+Firma 80 · Alias 70 · Domain 65
 * Bing (safeSearch=Off): Adult/Nische 88 · Foren/Leaks 76
 */
export function planGoogleSearches(
  identity: IdentityView | null
): IntelligenceQueryPlan[] {
  return planScoredGoogleSearches(identity).map((plan) => ({
    id: plan.id,
    label: plan.label,
    query: plan.query,
    help: plan.help,
    engine: plan.engine,
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
    const key = `${plan.engine}:${plan.query.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (!plan.query.trim() || seen.has(key)) return;
    seen.add(key);
    candidates.push(plan);
  }

  // —— Google: sauberes Hauptprofil (SafeSearch AUS) ——
  if (fp.phones[0]) {
    push({
      id: "g-phone",
      label: "Telefon",
      query: `"${fp.phones[0]}"`,
      help: "Google · Score 100 — Telefonnummer aus dem Profil (safe=off).",
      searchScore: 100,
      engine: "google",
    });
  }
  if (fp.emails[0]) {
    push({
      id: "g-email",
      label: "E-Mail",
      query: `"${fp.emails[0]}"`,
      help: "Google · Score 95 — E-Mail aus dem Profil (safe=off).",
      searchScore: 95,
      engine: "google",
    });
  }
  if (fullName && fp.location) {
    push({
      id: "g-name-location",
      label: "Name + Wohnort",
      query: `"${fullName}" ${fp.location}`,
      help: "Google · Score 90 — Name mit Wohnort (safe=off).",
      searchScore: 90,
      engine: "google",
    });
  } else if (fullName) {
    push({
      id: "g-name",
      label: "Name",
      query: `"${fullName}"`,
      help: "Google · Score 85 — Name ohne Wohnort (safe=off).",
      searchScore: 85,
      engine: "google",
    });
  }
  if (fullName && fp.company) {
    push({
      id: "g-name-company",
      label: "Name + Firma",
      query: `"${fullName}" "${fp.company}"`,
      help: "Google · Score 80 — Name mit Firma (safe=off).",
      searchScore: 80,
      engine: "google",
    });
  }
  if (fp.aliases[0]) {
    push({
      id: "g-alias",
      label: "Alias",
      query: `"${fp.aliases[0]}"`,
      help: "Google · Score 70 — Alias / Benutzername (safe=off).",
      searchScore: 70,
      engine: "google",
    });
  }
  if (fp.domains[0] && fullName) {
    push({
      id: "g-domain",
      label: "Domain",
      query: `site:${fp.domains[0]} "${fullName}"`,
      help: "Google · Score 65 — Domain aus dem Profil (safe=off).",
      searchScore: 65,
      engine: "google",
    });
  }

  // —— Bing: unzensierter Adult-/Nischen- und Foren-Footprint ——
  if (fullName) {
    push({
      id: "b-adult-niche",
      label: "Adult / Nische",
      query: `"${fullName}" (site:joyclub.de OR site:kaufmich.com OR site:fetlife.com OR site:onlyfans.com)`,
      help: "Bing · Score 88 — Erotik- & Nischen-Footprint (safeSearch=Off).",
      searchScore: 88,
      engine: "bing",
    });
    push({
      id: "b-forum-leak",
      label: "Foren / Leaks",
      query: `"${fullName}" (forum OR leak OR profil OR "geleakt")`,
      help: "Bing · Score 76 — Foren & Leaks unzensiert (safeSearch=Off).",
      searchScore: 76,
      engine: "bing",
    });
  }

  return candidates.sort((a, b) => b.searchScore - a.searchScore).slice(0, 5);
}

export function normalizeSearchCacheKey(
  query: string,
  engine: SerpSearchEngine = "google"
): string {
  return `${engine}:${query.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

/** @deprecated use planGoogleSearches — kept for identity helpers */
export function resolvePlannerIdentity(identity: IdentityView | null) {
  return {
    first: clean(identity?.personal.firstName),
    last: clean(identity?.personal.lastName),
  };
}
