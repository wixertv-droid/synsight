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

/** Enterprise OSINT — lieber 15 präzise Queries als Combinatorial Blow-up */
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
 * OSINT Search Planner — nur sinnvolle Prioritäts-Queries.
 *
 * Priorität (Sprint 6C):
 * 1 Vorname+Nachname+Wohnort · 2 Name+Firma · 3 Name · 4 E-Mail ·
 * 5 Telefon · 6 Alias · 7 Benutzername · 8 Domain ·
 * danach nur Zusatzvektoren bei vorhandenen Merkmalen.
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
  const usernames = unique([
    ...(identity?.aliases.usernames ?? []),
    ...fp.socialHandles.map((h) => h.username).filter(Boolean),
  ]);
  const aliases = unique([
    ...(identity?.aliases.nicknames ?? []),
    ...(identity?.aliases.gamingNames ?? []),
    identity?.aliases.publicAlias ?? "",
    ...fp.aliases,
  ]).filter((a) => !usernames.some((u) => u.toLowerCase() === a.toLowerCase()));
  const allHandles = unique([...aliases, ...usernames]);
  const domains = unique(fp.domains);

  const candidates: ScoredSearchPlan[] = [];
  const seen = new Set<string>();

  function push(plan: ScoredSearchPlan) {
    const key = `${plan.engine}:${plan.query.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (!plan.query.trim() || seen.has(key)) return;
    seen.add(key);
    candidates.push(plan);
  }

  // P1 — Vorname + Nachname + Wohnort
  if (fullName && locations.length > 0) {
    push({
      id: "p1-name-location",
      label: "Name + Wohnort",
      query: `"${fullName}" ${orGroup(locations, true, 4)}`,
      help: "Priorität 1 · Vorname + Nachname + Wohnort(e).",
      searchScore: 100,
      engine: "google",
      vector: "identity_location",
    });
  }

  // P2 — Vorname + Nachname + Firma
  if (fullName && companies.length > 0) {
    push({
      id: "p2-name-company",
      label: "Name + Firma",
      query: `"${fullName}" ${orGroup(companies, true, 4)}`,
      help: "Priorität 2 · Vorname + Nachname + Firma.",
      searchScore: 95,
      engine: "google",
      vector: "identity_professional",
    });
  }

  // P3 — Vorname + Nachname
  if (fullName) {
    push({
      id: "p3-exact-name",
      label: "Exakter Name",
      query: `"${fullName}"`,
      help: "Priorität 3 · Vorname + Nachname.",
      searchScore: 90,
      engine: "google",
      vector: "identity",
    });
  }

  // P4 — E-Mail (je Adresse, budget-bewusst)
  for (const [index, email] of emails.slice(0, 3).entries()) {
    push({
      id: `p4-email-${index + 1}`,
      label: `E-Mail · ${email}`,
      query: `"${email}"`,
      help: "Priorität 4 · Exakte E-Mail-Adresse.",
      searchScore: 88 - index,
      engine: "google",
      vector: "email",
    });
  }

  // P5 — Telefon
  for (const [index, phone] of phones.slice(0, 3).entries()) {
    push({
      id: `p5-phone-${index + 1}`,
      label: `Telefon · ${phone}`,
      query: `"${phone}"`,
      help: "Priorität 5 · Exakte Telefonnummer.",
      searchScore: 86 - index,
      engine: "google",
      vector: "phone",
    });
  }

  // P6 — Alias
  if (aliases.length > 0) {
    push({
      id: "p6-alias",
      label: "Alias",
      query: orGroup(aliases, true, 6),
      help: "Priorität 6 · Öffentliche Aliase / Nicknames.",
      searchScore: 82,
      engine: "google",
      vector: "alias",
    });
  }

  // P7 — Benutzername
  if (usernames.length > 0) {
    push({
      id: "p7-username",
      label: "Benutzername",
      query: `${orGroup(usernames, true, 6)} (site:github.com OR site:reddit.com OR site:instagram.com OR site:tiktok.com OR site:x.com OR site:twitter.com OR site:steamcommunity.com)`,
      help: "Priorität 7 · Benutzernamen auf typischen Plattformen.",
      searchScore: 80,
      engine: "google",
      vector: "username",
    });
  }

  // P8 — Domain
  if (domains.length > 0) {
    const domainQuery = fullName
      ? `(${domains
          .slice(0, 4)
          .map((d) => `site:${d}`)
          .join(" OR ")}) "${fullName}"`
      : domains
          .slice(0, 4)
          .map((d) => `site:${d}`)
          .join(" OR ");
    push({
      id: "p8-domains",
      label: "Domain / Webseite",
      query: domainQuery,
      help: "Priorität 8 · Eigene Domains und Webseiten.",
      searchScore: 76,
      engine: "google",
      vector: "domains",
    });
  }

  // Zusatz — nur wenn Merkmale vorhanden und Budget bleibt
  if (fullName) {
    push({
      id: "x-business",
      label: "Business Profiles",
      query: `"${fullName}" (site:linkedin.com/in OR site:xing.com/profile OR site:northdata.de OR site:companyhouse.de)`,
      help: "Zusatz · Business-/Register-Profile.",
      searchScore: 72,
      engine: "google",
      vector: "business",
    });
    push({
      id: "x-docs",
      label: "Public Records",
      query: `"${fullName}" (filetype:pdf OR "Impressum" OR "Handelsregister" OR leak OR geleakt)`,
      help: "Zusatz · Dokumente & öffentliche Register.",
      searchScore: 68,
      engine: "google",
      vector: "docs_leaks",
    });
  }

  if (fullName && locations.length > 0) {
    push({
      id: "x-forum",
      label: "Foren / Mentions",
      query: `"${fullName}" ${orGroup(locations, true, 3)} (forum OR profil OR community)`,
      help: "Zusatz · Foren mit Namens+Ort-Anker.",
      searchScore: 64,
      engine: "bing",
      vector: "forum_mentions",
    });
  } else if (fullName) {
    push({
      id: "x-forum",
      label: "Foren / Mentions",
      query: `"${fullName}" (forum OR profil OR community)`,
      help: "Zusatz · Foren & Erwähnungen.",
      searchScore: 62,
      engine: "bing",
      vector: "forum_mentions",
    });
  }

  // Adult / Niche — max. 2 Alias-Queries, niedrigere Priorität als Core-Identität
  for (const [index, handle] of allHandles.slice(0, 2).entries()) {
    push({
      id: `x-adult-${index + 1}`,
      label: `Adult / Niche · ${handle}`,
      query: `"${handle}" ${ADULT_SITE_DORK}`,
      help: `Zusatz · Exakter Handle „${handle}“ Adult/Nische (Bing, safeSearch=Off).`,
      searchScore: 58 - index,
      engine: "bing",
      vector: "adult_alias",
    });
  }

  // Strikt nach Priorität (searchScore), max 15, keine Duplikate (bereits via seen)
  return candidates
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, MAX_QUERIES);
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
