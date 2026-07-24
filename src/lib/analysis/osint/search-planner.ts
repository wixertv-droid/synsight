import type { IdentityView } from "@/lib/services/identity-service";
import type { IntelligenceQueryPlan } from "@/lib/analysis/types";

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * SearchPlanner — max. 5 Queries, feste Priorität, nur vorhandene Profildaten.
 * Keine künstlichen Kombinationen, keine Duplikate.
 */
export function planGoogleSearches(
  identity: IdentityView | null
): IntelligenceQueryPlan[] {
  const first = clean(identity?.personal.firstName);
  const last = clean(identity?.personal.lastName);
  const fullName = first && last ? `${first} ${last}` : first || last || "";
  const location = clean(identity?.personal.location);
  const company =
    clean(identity?.personal.company) || clean(identity?.companies?.[0]) || "";
  const email = [...(identity?.emails ?? [])].map(clean).find(Boolean) || "";
  const phone =
    [
      clean(identity?.personal.phone),
      ...(identity?.phoneNumbers ?? []).map(clean),
    ].find(Boolean) || "";
  const alias =
    [
      clean(identity?.aliases.publicAlias),
      ...(identity?.aliases.usernames ?? []),
      ...(identity?.aliases.nicknames ?? []),
      ...(identity?.aliases.gamingNames ?? []),
      ...(identity?.aliases.formerNames ?? []),
    ]
      .map(clean)
      .find(Boolean) || "";

  const planned: IntelligenceQueryPlan[] = [];
  const seen = new Set<string>();

  function push(plan: IntelligenceQueryPlan) {
    const key = plan.query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key) || planned.length >= 5) return;
    seen.add(key);
    planned.push(plan);
  }

  // 1. Name + Wohnort
  if (fullName && location) {
    push({
      id: "q-name-location",
      label: "Name + Wohnort",
      query: `"${fullName}" ${location}`,
      help: "Priorität 1: Name mit Wohnort aus dem Profil.",
    });
  } else if (fullName) {
    push({
      id: "q-name",
      label: "Name",
      query: `"${fullName}"`,
      help: "Name ohne Wohnort — Wohnort fehlt im Profil.",
    });
  }

  // 2. Name + Firma
  if (fullName && company) {
    push({
      id: "q-name-company",
      label: "Name + Firma",
      query: `"${fullName}" "${company}"`,
      help: "Priorität 2: Name mit Unternehmen aus dem Profil.",
    });
  }

  // 3. E-Mail
  if (email) {
    push({
      id: "q-email",
      label: "E-Mail",
      query: `"${email}"`,
      help: "Priorität 3: hinterlegte E-Mail-Adresse.",
    });
  }

  // 4. Telefon
  if (phone) {
    push({
      id: "q-phone",
      label: "Telefon",
      query: `"${phone}"`,
      help: "Priorität 4: hinterlegte Telefonnummer.",
    });
  }

  // 5. Alias / Benutzername
  if (alias) {
    push({
      id: "q-alias",
      label: "Alias",
      query: `"${alias}"`,
      help: "Priorität 5: Alias / Benutzername aus dem Profil.",
    });
  }

  return planned.slice(0, 5);
}

export function normalizeSearchCacheKey(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}
