import type { IdentityView } from "@/lib/services/identity-service";
import type {
  IntelligenceQueryPlan,
  SerpSearchEngine,
} from "@/lib/analysis/types";
import { buildIdentityFingerprint } from "@/lib/analysis/osint/identity-fingerprint";

export interface ScoredSearchPlan extends IntelligenceQueryPlan {
  searchScore: number;
  engine: SerpSearchEngine;
  vector: string;
}

/** Recon Matrix — etwas Luft für 1 Bing-Adult-Query je Alias */
const MAX_QUERIES = 15;

const ADULT_SITE_DORK =
  '(site:joyclub.de OR site:einfachgeiler.com OR site:amarotic.com OR site:onlyfans.com OR "amateur")';

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function orGroup(values: string[], quoted = true, limit = 8): string {
  const parts = unique(values).slice(0, limit);
  if (parts.length === 0) return "";
  if (parts.length === 1) return quoted ? `"${parts[0]}"` : parts[0];
  return `(${parts.map((v) => (quoted ? `"${v}"` : v)).join(" OR ")})`;
}

/**
 * OSINT Reconnaissance Matrix — Google + Bing Dorks.
 * Alias-Queries immer exakt quoted (`"Alias"`) — kein Fuzzy.
 * Pro Alias: eigene Bing-Adult-Query (safeSearch=Off).
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

  const locations = unique([
    fp.location,
    ...fp.previousLocations,
    ...(identity?.personal.previousLocations ?? []),
  ]);
  const companies = unique([
    fp.company,
    ...fp.companies,
    ...(identity?.companies ?? []),
  ]);
  const emails = unique(fp.emails);
  const phones = unique(fp.phones);
  const aliases = unique([
    ...(identity?.aliases.usernames ?? []),
    ...(identity?.aliases.nicknames ?? []),
    ...(identity?.aliases.gamingNames ?? []),
    identity?.aliases.publicAlias ?? "",
    ...fp.aliases,
    ...fp.socialHandles.map((h) => h.username).filter(Boolean),
  ]);
  const domains = unique(fp.domains);

  const candidates: ScoredSearchPlan[] = [];
  const seen = new Set<string>();

  function push(plan: ScoredSearchPlan) {
    const key = `${plan.engine}:${plan.query.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (!plan.query.trim() || seen.has(key)) return;
    seen.add(key);
    candidates.push(plan);
  }

  // 1. Direct Identifiers
  const idParts = [
    ...emails.map((e) => `"${e}"`),
    ...phones.map((p) => `"${p}"`),
  ];
  if (idParts.length > 0) {
    push({
      id: "v-direct-ids",
      label: "Direct Identifiers",
      query: idParts.slice(0, 6).join(" OR "),
      help: "Vector 1 · E-Mails & Telefonnummern (Google, safe=off).",
      searchScore: 100,
      engine: "google",
      vector: "direct_identifiers",
    });
  }

  // 2. Identity + Location
  if (fullName && locations.length > 0) {
    push({
      id: "v-identity-location",
      label: "Identity + Location",
      query: `"${fullName}" ${orGroup(locations)}`,
      help: "Vector 2 · Name mit allen Wohnorten (Google).",
      searchScore: 95,
      engine: "google",
      vector: "identity_location",
    });
  } else if (fullName) {
    push({
      id: "v-identity",
      label: "Exact Identity",
      query: `"${fullName}"`,
      help: "Vector 2b · Exakter Name ohne Ort (Google).",
      searchScore: 88,
      engine: "google",
      vector: "identity",
    });
  }

  // 3. Identity + Professional
  if (fullName && companies.length > 0) {
    push({
      id: "v-identity-professional",
      label: "Identity + Professional",
      query: `"${fullName}" ${orGroup(companies)}`,
      help: "Vector 3 · Name mit allen Firmen (Google).",
      searchScore: 92,
      engine: "google",
      vector: "identity_professional",
    });
  }

  // 4. Alias Social — exakt quoted
  if (aliases.length > 0) {
    const aliasGroup = orGroup(aliases, true, 8);
    push({
      id: "v-alias-social",
      label: "Alias Social",
      query: `${aliasGroup} (site:instagram.com OR site:tiktok.com OR site:twitter.com OR site:x.com OR site:github.com OR site:reddit.com OR site:pinterest.com)`,
      help: "Vector 4 · Exakte Benutzernamen auf Social-Plattformen (Google).",
      searchScore: 90,
      engine: "google",
      vector: "alias_social",
    });
    push({
      id: "v-alias-general",
      label: "Username Sweep",
      query: aliasGroup,
      help: "Vector 4b · Exakte Benutzernamen allgemein (Google).",
      searchScore: 84,
      engine: "google",
      vector: "alias_general",
    });
  }

  // 5. Business
  if (fullName) {
    push({
      id: "v-business",
      label: "Business Profiles",
      query: `"${fullName}" (site:linkedin.com/in OR site:xing.com/profile OR site:northdata.de OR site:companyhouse.de)`,
      help: "Vector 5 · Business-/Register-Profile (Google).",
      searchScore: 86,
      engine: "google",
      vector: "business",
    });
  }

  // 6. HARTE REGEL — je Alias eine eigene Bing-Adult-Query (exakt quoted)
  for (const [index, alias] of aliases.slice(0, 6).entries()) {
    push({
      id: `v-adult-alias-${index + 1}`,
      label: `Adult Alias · ${alias}`,
      query: `"${alias}" ${ADULT_SITE_DORK}`,
      help: `Vector 6.${index + 1} · Exakter Alias „${alias}“ Adult/Nische (Bing, safeSearch=Off).`,
      searchScore: 94 - index,
      engine: "bing",
      vector: "adult_alias",
    });
  }

  // 7. Public Records
  if (fullName) {
    push({
      id: "v-docs-leaks",
      label: "Public Records",
      query: `"${fullName}" (filetype:pdf OR "Impressum" OR "Handelsregister" OR leak OR geleakt)`,
      help: "Vector 7 · Dokumente & öffentliche Register (Google).",
      searchScore: 82,
      engine: "google",
      vector: "docs_leaks",
    });
  }

  // 8. Forums (name — location-aware scoring filtert Namensvettern später)
  if (fullName && locations.length > 0) {
    push({
      id: "v-forum-leak",
      label: "Foren / Mentions",
      query: `"${fullName}" ${orGroup(locations, true, 4)} (forum OR profil OR community)`,
      help: "Vector 8 · Foren mit Namens+Ort-Anker (Bing).",
      searchScore: 78,
      engine: "bing",
      vector: "forum_mentions",
    });
  } else if (fullName) {
    push({
      id: "v-forum-leak",
      label: "Foren / Mentions",
      query: `"${fullName}" (forum OR profil OR community)`,
      help: "Vector 8 · Foren & Erwähnungen (Bing).",
      searchScore: 76,
      engine: "bing",
      vector: "forum_mentions",
    });
  }

  // 9. Domains
  if (domains.length > 0 && fullName) {
    push({
      id: "v-domains",
      label: "Own Domains",
      query: `(${domains
        .slice(0, 4)
        .map((d) => `site:${d}`)
        .join(" OR ")}) "${fullName}"`,
      help: "Vector 9 · Eigene Domains / Webseiten (Google).",
      searchScore: 74,
      engine: "google",
      vector: "domains",
    });
  }

  // Priorität: Adult-Alias-Queries und Core behalten, Rest nach Score kappen
  const adultAlias = candidates.filter((c) => c.vector === "adult_alias");
  const rest = candidates
    .filter((c) => c.vector !== "adult_alias")
    .sort((a, b) => b.searchScore - a.searchScore);
  const budget = Math.max(0, MAX_QUERIES - adultAlias.length);
  return [...adultAlias, ...rest.slice(0, budget)].sort(
    (a, b) => b.searchScore - a.searchScore
  );
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
    first: (identity?.personal.firstName ?? "").trim(),
    last: (identity?.personal.lastName ?? "").trim(),
  };
}

export const OSINT_MAX_QUERIES = MAX_QUERIES;
