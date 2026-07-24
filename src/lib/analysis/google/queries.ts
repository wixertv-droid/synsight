import type { IdentityView } from "@/lib/services/identity-service";
import type { IntelligenceQueryPlan } from "@/lib/analysis/types";
import { planGoogleSearches } from "@/lib/analysis/osint/search-planner";

/**
 * Sprint 6B: max. 5 Suchanfragen über SearchPlanner.
 * Keine künstlichen Kombinationen — nur vorhandene Profildaten.
 */
export function buildGoogleQueriesFromIdentity(
  identity: IdentityView | null
): IntelligenceQueryPlan[] {
  return planGoogleSearches(identity);
}

export function buildMissingProfileHints(
  identity: IdentityView | null
): string[] {
  const hints: string[] = [];
  if (!identity?.personal.firstName || !identity?.personal.lastName) {
    hints.push("Vor- und Nachname im Identitätsprofil ergänzen");
  }
  if ((identity?.emails.length ?? 0) === 0) {
    hints.push("E-Mail-Adressen hinterlegen");
  }
  if (!identity?.personal.phone && (identity?.phoneNumbers.length ?? 0) === 0) {
    hints.push("Telefonnummern ergänzen");
  }
  if (!identity?.personal.company && (identity?.companies.length ?? 0) === 0) {
    hints.push("Unternehmen angeben");
  }
  if (!identity?.personal.location) {
    hints.push("Wohnort angeben (erhöht Trefferqualität)");
  }
  if (
    !identity?.aliases.publicAlias &&
    (identity?.aliases.usernames.length ?? 0) === 0
  ) {
    hints.push("Alias / Benutzername hinterlegen");
  }
  return hints;
}

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export function resolveSubjectName(identity: IdentityView | null): string {
  const first = clean(identity?.personal.firstName);
  const last = clean(identity?.personal.lastName);
  if (first && last) return `${first} ${last}`;
  return first || last || "Ihr Profil";
}
