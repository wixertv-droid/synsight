import { getIdentityRepository } from "@/lib/repositories";
import type { IdentitySnapshot } from "@/lib/repositories/identity-repository";
import type { IdentityProfileInput } from "@/lib/validation/identity";
import type { ProcessedProfileImage } from "@/lib/media/image-pipeline";
import { removeStoredProfileImage } from "@/lib/media/image-pipeline";

function uniqueStrings(values: string[]): string[] {
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
      view.aliases.usernames.length > 0 ||
      view.aliases.gamingNames.length > 0 ||
      view.aliases.formerNames.length > 0,
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
      // Nicknames und Benutzernamen sind dasselbe — zusammengeführt anzeigen
      nicknames: [],
      formerNames: snapshot.aliases
        .filter((item) => item.aliasType === "former_name")
        .map((item) => item.alias),
      usernames: uniqueStrings([
        ...snapshot.aliases
          .filter(
            (item) =>
              item.aliasType === "username" || item.aliasType === "nickname"
          )
          .map((item) => item.alias),
      ]),
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

export async function persistProcessedProfileImage(
  userId: number,
  image: ProcessedProfileImage
) {
  const repository = getIdentityRepository();
  const result = await repository.upsertImage(userId, image);
  if (
    result.replaced &&
    result.replaced.storagePath !== result.image.storagePath
  ) {
    await removeStoredProfileImage(userId, result.replaced.storagePath).catch(
      () => {
        // DB now references the new image; orphan cleanup is best effort.
      }
    );
  }
  return {
    imageType: result.image.imageType,
    storagePath: result.image.storagePath,
    originalPath: result.image.originalPath ?? undefined,
    analysisPath: result.image.analysisPath ?? undefined,
    thumbnailPath: result.image.thumbnailPath ?? undefined,
    contentHash: result.image.contentHash ?? undefined,
    mimeType: result.image.mimeType ?? undefined,
    byteSize: result.image.byteSize ?? undefined,
  };
}

export async function deleteProfileImage(
  userId: number,
  imageType: "front" | "left_profile" | "right_profile" | "angled"
): Promise<boolean> {
  const deleted = await getIdentityRepository().deleteImage(userId, imageType);
  if (!deleted) return false;
  await removeStoredProfileImage(userId, deleted.storagePath).catch(() => {
    // DB deletion is authoritative; cleanup can be retried operationally.
  });
  return true;
}
