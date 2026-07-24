import type { IdentityView } from "@/lib/services/identity-service";
import type { AnalysisKey } from "@/lib/credits/pricing";

export interface ProfileModuleReadiness {
  key: AnalysisKey;
  label: string;
  ready: boolean;
  filled: number;
  total: number;
  missing: string[];
}

function hasName(v: IdentityView): boolean {
  return Boolean(v.personal.firstName?.trim() && v.personal.lastName?.trim());
}

function hasPhone(v: IdentityView): boolean {
  return Boolean(v.personal.phone?.trim() || v.phoneNumbers.length > 0);
}

function hasEmail(v: IdentityView): boolean {
  return v.emails.length > 0;
}

function hasLocation(v: IdentityView): boolean {
  return Boolean(
    v.personal.location?.trim() || v.personal.previousLocations.length > 0
  );
}

function hasCompany(v: IdentityView): boolean {
  return Boolean(v.personal.company?.trim() || v.companies.length > 0);
}

function hasAlias(v: IdentityView): boolean {
  return Boolean(
    v.aliases.publicAlias?.trim() ||
    v.aliases.usernames.length > 0 ||
    v.aliases.gamingNames.length > 0
  );
}

function hasWeb(v: IdentityView): boolean {
  return v.websites.length > 0 || v.domains.length > 0;
}

function hasSocial(v: IdentityView): boolean {
  return v.socialAccounts.length > 0;
}

function hasImages(v: IdentityView): boolean {
  return v.images.length > 0;
}

function score(
  checks: Array<{ ok: boolean; label: string }>
): Omit<ProfileModuleReadiness, "key" | "label"> {
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  const filled = checks.filter((c) => c.ok).length;
  return {
    ready: missing.length === 0,
    filled,
    total: checks.length,
    missing,
  };
}

/** Readiness je Analyseart — Felder die schon in Stammdaten liegen zählen mit. */
export function buildProfileModuleReadiness(
  view: IdentityView
): ProfileModuleReadiness[] {
  return [
    {
      key: "google_search",
      label: "Google Analyse",
      ...score([
        { ok: hasName(view), label: "Vor- und Nachname" },
        { ok: hasLocation(view), label: "Wohnort" },
        { ok: hasEmail(view), label: "E-Mail" },
        { ok: hasPhone(view), label: "Telefon" },
        { ok: hasCompany(view), label: "Unternehmen" },
        { ok: hasAlias(view), label: "Benutzername / Alias" },
      ]),
    },
    {
      key: "phone_analysis",
      label: "Telefon Analyse",
      ...score([{ ok: hasPhone(view), label: "Telefonnummer" }]),
    },
    {
      key: "email_analysis",
      label: "E-Mail Analyse",
      ...score([{ ok: hasEmail(view), label: "E-Mail-Adresse" }]),
    },
    {
      key: "website_analysis",
      label: "Website Analyse",
      ...score([{ ok: view.websites.length > 0, label: "Website" }]),
    },
    {
      key: "domain_analysis",
      label: "Domain Analyse",
      ...score([{ ok: view.domains.length > 0, label: "Domain" }]),
    },
    {
      key: "alias_analysis",
      label: "Alias Analyse",
      ...score([{ ok: hasAlias(view), label: "Benutzername / Alias" }]),
    },
    {
      key: "social_media",
      label: "Social Media Analyse",
      ...score([{ ok: hasSocial(view), label: "Social-Account" }]),
    },
    {
      key: "reverse_image_search",
      label: "Reverse Image Search",
      ...score([
        { ok: hasImages(view), label: "Referenzbild" },
        {
          ok: view.images.length >= 4,
          label: "Alle 4 Bildansichten",
        },
      ]),
    },
    {
      key: "person_search",
      label: "Personensuche",
      ...score([
        { ok: hasName(view), label: "Name" },
        { ok: hasLocation(view), label: "Wohnort" },
        { ok: hasAlias(view) || hasSocial(view), label: "Alias oder Social" },
      ]),
    },
    {
      key: "deep_intelligence",
      label: "Deep Intelligence",
      ...score([
        { ok: hasName(view), label: "Name" },
        { ok: hasEmail(view), label: "E-Mail" },
        { ok: hasPhone(view), label: "Telefon" },
        { ok: hasAlias(view), label: "Alias" },
        { ok: hasSocial(view), label: "Social" },
        { ok: hasWeb(view) || hasCompany(view), label: "Web/Firma" },
      ]),
    },
    {
      key: "full_identity_analysis",
      label: "Komplette Identitätsanalyse",
      ...score([
        { ok: hasName(view), label: "Name" },
        { ok: hasLocation(view), label: "Wohnort" },
        { ok: hasEmail(view), label: "E-Mail" },
        { ok: hasPhone(view), label: "Telefon" },
        { ok: hasAlias(view), label: "Alias" },
        { ok: hasSocial(view), label: "Social" },
        { ok: hasWeb(view), label: "Web/Domain" },
        { ok: hasCompany(view), label: "Unternehmen" },
        { ok: hasImages(view), label: "Referenzbild" },
      ]),
    },
  ];
}

export function splitFirstNames(firstName: string): {
  primary: string;
  additional: string[];
} {
  const parts = firstName
    .trim()
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    primary: parts[0] ?? "",
    additional: parts.slice(1),
  };
}

export function joinFirstNames(primary: string, additional: string[]): string {
  return [primary.trim(), ...additional.map((a) => a.trim()).filter(Boolean)]
    .filter(Boolean)
    .join(" ");
}
