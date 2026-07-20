import type { IdentityView } from "@/lib/services/identity-service";
import type { IntelligenceQueryPlan } from "@/lib/analysis/types";

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * Build search queries solely from user-provided identity profile fields.
 * These are the queries SynSight will execute — never invented terms.
 */
export function buildGoogleQueriesFromIdentity(
  identity: IdentityView | null
): IntelligenceQueryPlan[] {
  const first = clean(identity?.personal.firstName);
  const last = clean(identity?.personal.lastName);
  const fullName = first && last ? `${first} ${last}` : first || last || "";
  const location = clean(identity?.personal.location);
  const address = clean(identity?.personal.addressLine);
  const company =
    clean(identity?.personal.company) || clean(identity?.companies[0]) || "";

  const emails = [...(identity?.emails ?? [])].map(clean).filter(Boolean);
  const phones = [
    clean(identity?.personal.phone),
    ...(identity?.phoneNumbers ?? []).map(clean),
  ].filter(Boolean);
  const aliases = [
    clean(identity?.aliases.publicAlias),
    ...(identity?.aliases.nicknames ?? []),
    ...(identity?.aliases.usernames ?? []),
    ...(identity?.aliases.formerNames ?? []),
    ...(identity?.aliases.gamingNames ?? []),
  ]
    .map(clean)
    .filter(Boolean);

  const queries: IntelligenceQueryPlan[] = [];

  if (fullName) {
    queries.push({
      id: "q-name",
      label: "Name",
      query: location ? `"${fullName}" ${location}` : `"${fullName}"`,
      help: "Klassische Namenssuche — erzeugt aus Vor- und Nachname im Profil.",
    });
  }

  if (company && fullName) {
    queries.push({
      id: "q-company",
      label: "Firma",
      query: `"${fullName}" "${company}"`,
      help: "Verknüpft Name und Unternehmen aus dem Profil.",
    });
  }

  if (address || location) {
    const place = address || location;
    if (fullName) {
      queries.push({
        id: "q-place",
        label: "Ort / Adresse",
        query: `"${fullName}" "${place}"`,
        help: "Kombination aus Name und hinterlegtem Ort oder Adresse.",
      });
    }
  }

  for (const email of emails.slice(0, 3)) {
    queries.push({
      id: `q-email-${email}`,
      label: "E-Mail",
      query: `"${email}"`,
      help: "Prüft öffentliche Indexierung der hinterlegten E-Mail-Adresse.",
    });
  }

  for (const phone of phones.slice(0, 2)) {
    queries.push({
      id: `q-phone-${phone}`,
      label: "Telefon",
      query: `"${phone}"`,
      help: "Prüft öffentliche Erwähnung der hinterlegten Telefonnummer.",
    });
  }

  for (const alias of aliases.slice(0, 3)) {
    queries.push({
      id: `q-alias-${alias}`,
      label: "Alias",
      query: `"${alias}"`,
      help: "Sucht den hinterlegten Alias in öffentlichen Quellen.",
    });
  }

  for (const site of [
    ...(identity?.websites ?? []),
    ...(identity?.domains ?? []),
  ].slice(0, 3)) {
    const host = site.replace(/^https?:\/\//, "").split("/")[0];
    if (fullName && host) {
      queries.push({
        id: `q-site-${host}`,
        label: "Website",
        query: `site:${host} "${fullName}"`,
        help: "Sucht den Namen auf der im Profil hinterlegten Domain.",
      });
    }
  }

  return queries;
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
  if ((identity?.socialAccounts.length ?? 0) === 0) {
    hints.push("Öffentliche Social-Profile verknüpfen");
  }
  if (
    (identity?.websites.length ?? 0) + (identity?.domains.length ?? 0) ===
    0
  ) {
    hints.push("Websites oder Domains eintragen");
  }
  return hints;
}

export function resolveSubjectName(identity: IdentityView | null): string {
  const first = clean(identity?.personal.firstName);
  const last = clean(identity?.personal.lastName);
  if (first && last) return `${first} ${last}`;
  return first || last || "Ihr Profil";
}
