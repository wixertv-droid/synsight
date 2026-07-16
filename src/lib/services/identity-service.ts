import { getIdentityRepository } from "@/lib/repositories";
import type { IdentitySnapshot } from "@/lib/repositories/identity-repository";
import type { IdentityProfileInput } from "@/lib/validation/identity";

export interface IdentityView {
  personal: {
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: string;
    phone: string;
    addressLine: string;
    location: string;
    previousLocations: string[];
    company: string;
  };
  aliases: {
    publicAlias: string;
    nicknames: string[];
    formerNames: string[];
    usernames: string[];
    gamingNames: string[];
  };
  emails: string[];
  phoneNumbers: string[];
  socialAccounts: Array<{
    platform: string;
    username: string;
    profileUrl: string;
    accountStatus: "active" | "former" | "unknown";
  }>;
  websites: string[];
  domains: string[];
  companies: string[];
  images: IdentityProfileInput["images"];
  completenessPercent: number;
}

function computeCompleteness(view: Omit<IdentityView, "completenessPercent">) {
  const checks = [
    Boolean(view.personal.firstName && view.personal.lastName),
    Boolean(view.personal.birthDate),
    Boolean(view.personal.gender),
    Boolean(view.personal.phone || view.phoneNumbers.length),
    Boolean(view.personal.addressLine || view.personal.location),
    view.personal.previousLocations.length > 0,
    Boolean(view.aliases.publicAlias) ||
      view.aliases.nicknames.length > 0 ||
      view.aliases.usernames.length > 0 ||
      view.aliases.gamingNames.length > 0,
    view.emails.length > 0,
    view.socialAccounts.length > 0,
    view.websites.length > 0 || view.domains.length > 0,
    view.companies.length > 0 || Boolean(view.personal.company),
    view.images.length > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function toView(snapshot: IdentitySnapshot): IdentityView {
  const base = {
    personal: {
      firstName: snapshot.profile.firstName,
      lastName: snapshot.profile.lastName,
      birthDate: snapshot.profile.birthDate ?? "",
      gender: snapshot.profile.gender ?? "",
      phone: snapshot.profile.phone ?? "",
      addressLine: snapshot.profile.addressLine ?? "",
      location: snapshot.profile.location ?? "",
      previousLocations: snapshot.profile.previousLocations ?? [],
      company: snapshot.profile.company ?? "",
    },
    aliases: {
      publicAlias: snapshot.profile.publicAlias ?? "",
      nicknames: snapshot.aliases
        .filter((item) => item.aliasType === "nickname")
        .map((item) => item.alias),
      formerNames: snapshot.aliases
        .filter((item) => item.aliasType === "former_name")
        .map((item) => item.alias),
      usernames: snapshot.aliases
        .filter((item) => item.aliasType === "username")
        .map((item) => item.alias),
      gamingNames: snapshot.aliases
        .filter((item) => item.aliasType === "gaming_name")
        .map((item) => item.alias),
    },
    emails: snapshot.emails.map((item) => item.email),
    phoneNumbers: snapshot.phoneNumbers.map((item) => item.phoneNumber),
    socialAccounts: snapshot.socialAccounts.map((item) => ({
      platform: item.platform,
      username: item.username,
      profileUrl: item.profileUrl ?? "",
      accountStatus: item.accountStatus ?? "active",
    })),
    websites: snapshot.traces
      .filter((item) => item.traceType === "website")
      .map((item) => item.value),
    domains: snapshot.traces
      .filter((item) => item.traceType === "domain")
      .map((item) => item.value),
    companies: snapshot.traces
      .filter((item) => item.traceType === "company")
      .map((item) => item.value),
    images: snapshot.images.map((image) => ({
      imageType: image.imageType,
      storagePath: image.storagePath,
      originalPath: image.originalPath ?? undefined,
      analysisPath: image.analysisPath ?? undefined,
      thumbnailPath: image.thumbnailPath ?? undefined,
      contentHash: image.contentHash ?? undefined,
      mimeType: image.mimeType ?? undefined,
      byteSize: image.byteSize ?? undefined,
    })),
  };
  return { ...base, completenessPercent: computeCompleteness(base) };
}

export async function getIdentityForUser(
  userId: number
): Promise<IdentityView | null> {
  const snapshot = await getIdentityRepository().getSnapshot(userId);
  if (!snapshot) return null;
  return toView(snapshot);
}

export async function saveIdentityForUser(
  userId: number,
  input: IdentityProfileInput
): Promise<IdentityView> {
  const snapshot = await getIdentityRepository().save(userId, input);
  return toView(snapshot);
}

export async function getIdentityCompleteness(userId: number): Promise<number> {
  const identity = await getIdentityForUser(userId);
  return identity?.completenessPercent ?? 0;
}
