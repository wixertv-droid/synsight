import type { IdentityView } from "@/lib/services/identity-service";
import { createHash } from "node:crypto";

function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export interface IdentityFingerprint {
  hash: string;
  subjectName: string;
  firstName: string;
  lastName: string;
  location: string;
  region: string;
  company: string;
  phones: string[];
  emails: string[];
  aliases: string[];
  domains: string[];
  websites: string[];
  socialHandles: Array<{ platform: string; username: string; url: string }>;
  hasProfileImages: boolean;
  matrix: Record<string, string | string[] | boolean | number>;
}

/**
 * Phase 1 — Identity Fingerprint aus allen Profildaten.
 */
export function buildIdentityFingerprint(
  identity: IdentityView | null
): IdentityFingerprint {
  const firstName = clean(identity?.personal.firstName);
  const lastName = clean(identity?.personal.lastName);
  const subjectName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || "Unbekannt";
  const location = clean(identity?.personal.location);
  const region = clean(identity?.personal.addressLine) || location;
  const company =
    clean(identity?.personal.company) || clean(identity?.companies?.[0]) || "";
  const phones = [
    clean(identity?.personal.phone),
    ...(identity?.phoneNumbers ?? []).map(clean),
  ].filter(Boolean);
  const emails = [...(identity?.emails ?? [])].map(clean).filter(Boolean);
  const aliases = [
    clean(identity?.aliases.publicAlias),
    ...(identity?.aliases.usernames ?? []),
    ...(identity?.aliases.nicknames ?? []),
    ...(identity?.aliases.gamingNames ?? []),
    ...(identity?.aliases.formerNames ?? []),
  ]
    .map(clean)
    .filter(Boolean);
  const websites = [...(identity?.websites ?? [])].map(clean).filter(Boolean);
  const domains = [
    ...(identity?.domains ?? []),
    ...websites.map((site) => {
      try {
        return new URL(
          site.startsWith("http") ? site : `https://${site}`
        ).hostname.replace(/^www\./, "");
      } catch {
        return site.replace(/^https?:\/\//, "").split("/")[0] || "";
      }
    }),
  ]
    .map(clean)
    .filter(Boolean);
  const socialHandles = (identity?.socialAccounts ?? []).map((account) => ({
    platform: clean(account.platform),
    username: clean(account.username),
    url: clean(account.profileUrl),
  }));
  const hasProfileImages = (identity?.images?.length ?? 0) > 0;

  const matrix = {
    subjectName,
    firstName,
    lastName,
    location,
    region,
    company,
    phones,
    emails,
    aliases,
    domains,
    websites,
    socialCount: socialHandles.length,
    hasProfileImages,
  };

  const hash = createHash("sha256")
    .update(JSON.stringify(matrix))
    .digest("hex")
    .slice(0, 16);

  return {
    hash,
    subjectName,
    firstName,
    lastName,
    location,
    region,
    company,
    phones,
    emails,
    aliases,
    domains: [...new Set(domains)],
    websites,
    socialHandles,
    hasProfileImages,
    matrix,
  };
}
