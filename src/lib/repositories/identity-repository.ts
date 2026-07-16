import type { IdentityProfileInput } from "@/lib/validation/identity";
import type {
  DigitalTrace,
  Profile,
  ProfileAdditionalEmail,
  ProfileAlias,
  ProfileImage,
  ProfilePhoneNumber,
  SocialAccount,
} from "@/types/domain";

export interface IdentitySnapshot {
  profile: Profile;
  aliases: ProfileAlias[];
  phoneNumbers: ProfilePhoneNumber[];
  emails: ProfileAdditionalEmail[];
  socialAccounts: SocialAccount[];
  traces: DigitalTrace[];
  images: ProfileImage[];
}

export interface IdentityRepository {
  getSnapshot(userId: number): Promise<IdentitySnapshot | null>;
  save(userId: number, input: IdentityProfileInput): Promise<IdentitySnapshot>;
}

const memory = globalThis as typeof globalThis & {
  __synsightIdentity?: Map<number, IdentitySnapshot>;
};

function emptySnapshot(userId: number, profile: Profile): IdentitySnapshot {
  return {
    profile,
    aliases: [],
    phoneNumbers: [],
    emails: [],
    socialAccounts: [],
    traces: [],
    images: [],
  };
}

export function createInMemoryIdentityRepository(
  getProfile: (userId: number) => Promise<Profile | null>,
  ensureDraft: (userId: number, seed?: Partial<Profile>) => Promise<Profile>
): IdentityRepository {
  const store =
    memory.__synsightIdentity ??
    (memory.__synsightIdentity = new Map<number, IdentitySnapshot>());

  return {
    async getSnapshot(userId) {
      const cached = store.get(userId);
      if (cached) return cached;
      const profile = await getProfile(userId);
      if (!profile) return null;
      const snapshot = emptySnapshot(userId, profile);
      store.set(userId, snapshot);
      return snapshot;
    },

    async save(userId, input) {
      const profile = await ensureDraft(userId, {
        firstName: input.personal.firstName,
        lastName: input.personal.lastName,
      });

      const nextProfile: Profile = {
        ...profile,
        firstName: input.personal.firstName,
        lastName: input.personal.lastName,
        birthDate: input.personal.birthDate || null,
        gender: (input.personal.gender || null) as Profile["gender"],
        phone: input.personal.phone || input.phoneNumbers[0] || null,
        company: input.personal.company || input.companies[0] || null,
        location: input.personal.location || null,
        addressLine: input.personal.addressLine || null,
        previousLocations: input.personal.previousLocations,
        publicAlias: input.aliases.publicAlias || null,
      };

      const now = new Date().toISOString();
      let id = 1;
      const snapshot: IdentitySnapshot = {
        profile: nextProfile,
        aliases: [
          ...(input.aliases.publicAlias
            ? [
                {
                  id: id++,
                  userId,
                  alias: input.aliases.publicAlias,
                  aliasType: "public_alias" as const,
                  createdAt: now,
                },
              ]
            : []),
          ...input.aliases.formerNames.map((alias) => ({
            id: id++,
            userId,
            alias,
            aliasType: "former_name" as const,
            createdAt: now,
          })),
          ...input.aliases.nicknames.map((alias) => ({
            id: id++,
            userId,
            alias,
            aliasType: "nickname" as const,
            createdAt: now,
          })),
          ...input.aliases.usernames.map((alias) => ({
            id: id++,
            userId,
            alias,
            aliasType: "username" as const,
            createdAt: now,
          })),
          ...input.aliases.gamingNames.map((alias) => ({
            id: id++,
            userId,
            alias,
            aliasType: "gaming_name" as const,
            createdAt: now,
          })),
        ],
        phoneNumbers: input.phoneNumbers.map((phoneNumber) => ({
          id: id++,
          userId,
          phoneNumber,
          label: null,
          createdAt: now,
        })),
        emails: input.emails.map((email) => ({
          id: id++,
          userId,
          email,
          createdAt: now,
        })),
        socialAccounts: input.socialAccounts.map((account) => ({
          id: id++,
          userId,
          platform: account.platform,
          username: account.username,
          profileUrl: account.profileUrl || null,
          accountStatus: account.accountStatus,
          createdAt: now,
          updatedAt: now,
        })),
        traces: [
          ...input.websites.map((value) => ({
            id: id++,
            userId,
            traceType: "website" as const,
            value,
            createdAt: now,
          })),
          ...input.domains.map((value) => ({
            id: id++,
            userId,
            traceType: "domain" as const,
            value,
            createdAt: now,
          })),
          ...input.companies.map((value) => ({
            id: id++,
            userId,
            traceType: "company" as const,
            value,
            createdAt: now,
          })),
        ],
        images: input.images.map((image) => ({
          id: id++,
          userId,
          imageType: image.imageType,
          storagePath: image.storagePath,
          originalPath: image.originalPath ?? null,
          analysisPath: image.analysisPath ?? null,
          thumbnailPath: image.thumbnailPath ?? null,
          contentHash: image.contentHash ?? null,
          mimeType: image.mimeType ?? null,
          byteSize: image.byteSize ?? null,
          uploadedAt: now,
        })),
      };

      store.set(userId, snapshot);
      return snapshot;
    },
  };
}
