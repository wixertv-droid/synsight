import { eq } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import {
  digitalTraces,
  profileAdditionalEmails,
  profileAliases,
  profileImages,
  profilePhoneNumbers,
  profiles,
  socialAccounts,
} from "@/lib/database/schema";
import { assertOwnedImagePath } from "@/lib/media/image-pipeline";
import type { IdentityProfileInput } from "@/lib/validation/identity";
import type { Profile } from "@/types/domain";
import {
  createInMemoryIdentityRepository,
  type IdentityRepository,
  type IdentitySnapshot,
} from "../identity-repository";
import { createProfileRepository } from "./profile-repository";

function mapProfile(row: typeof profiles.$inferSelect): Profile {
  const previous = row.previousLocations;
  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    birthDate: row.birthDate ?? null,
    gender: row.gender ?? null,
    phone: row.phone,
    company: row.company,
    location: row.location ?? null,
    addressLine: row.addressLine ?? null,
    previousLocations: Array.isArray(previous) ? previous : [],
    region: row.region,
    locale: row.locale,
    publicAlias: row.publicAlias,
    onboardingStep: row.onboardingStep,
    onboardingCompletedAt: row.onboardingCompletedAt,
  };
}

export function createMysqlIdentityRepository(
  db: SynSightDatabase
): IdentityRepository {
  return {
    async getSnapshot(userId) {
      const profileRows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);
      if (!profileRows[0]) return null;

      const [aliases, phoneNumbers, emails, socials, traces, images] =
        await Promise.all([
          db
            .select()
            .from(profileAliases)
            .where(eq(profileAliases.userId, userId)),
          db
            .select()
            .from(profilePhoneNumbers)
            .where(eq(profilePhoneNumbers.userId, userId)),
          db
            .select()
            .from(profileAdditionalEmails)
            .where(eq(profileAdditionalEmails.userId, userId)),
          db
            .select()
            .from(socialAccounts)
            .where(eq(socialAccounts.userId, userId)),
          db
            .select()
            .from(digitalTraces)
            .where(eq(digitalTraces.userId, userId)),
          db
            .select()
            .from(profileImages)
            .where(eq(profileImages.userId, userId)),
        ]);

      return {
        profile: mapProfile(profileRows[0]),
        aliases: aliases.map((row) => ({
          id: row.id,
          userId: row.userId,
          alias: row.alias,
          aliasType: row.aliasType,
          createdAt: row.createdAt,
        })),
        phoneNumbers: phoneNumbers.map((row) => ({
          id: row.id,
          userId: row.userId,
          phoneNumber: row.phoneNumber,
          label: row.label,
          createdAt: row.createdAt,
        })),
        emails: emails.map((row) => ({
          id: row.id,
          userId: row.userId,
          email: row.email,
          createdAt: row.createdAt,
        })),
        socialAccounts: socials.map((row) => ({
          id: row.id,
          userId: row.userId,
          platform: row.platform,
          username: row.username,
          profileUrl: row.profileUrl,
          accountStatus: row.accountStatus,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
        traces: traces.map((row) => ({
          id: row.id,
          userId: row.userId,
          traceType: row.traceType,
          value: row.value,
          createdAt: row.createdAt,
        })),
        images: images.map((row) => ({
          id: row.id,
          userId: row.userId,
          imageType: row.imageType,
          storagePath: row.storagePath,
          originalPath: row.originalPath,
          analysisPath: row.analysisPath,
          thumbnailPath: row.thumbnailPath,
          contentHash: row.contentHash,
          mimeType: row.mimeType,
          byteSize: row.byteSize,
          uploadedAt: row.uploadedAt,
        })),
      } satisfies IdentitySnapshot;
    },

    async save(userId, input: IdentityProfileInput) {
      await db.transaction(async (transaction) => {
        await transaction
          .insert(profiles)
          .values({
            userId,
            firstName: input.personal.firstName,
            lastName: input.personal.lastName,
            birthDate: input.personal.birthDate || null,
            gender: (input.personal.gender || null) as
              | "female"
              | "male"
              | "non_binary"
              | "prefer_not_to_say"
              | "other"
              | null,
            phone: input.personal.phone || input.phoneNumbers[0] || null,
            company: input.personal.company || input.companies[0] || null,
            location: input.personal.location || null,
            addressLine: input.personal.addressLine || null,
            previousLocations: input.personal.previousLocations,
            publicAlias: input.aliases.publicAlias || null,
            region: "EU",
            locale: "de-DE",
          })
          .onDuplicateKeyUpdate({
            set: {
              firstName: input.personal.firstName,
              lastName: input.personal.lastName,
              birthDate: input.personal.birthDate || null,
              gender: (input.personal.gender || null) as
                | "female"
                | "male"
                | "non_binary"
                | "prefer_not_to_say"
                | "other"
                | null,
              phone: input.personal.phone || input.phoneNumbers[0] || null,
              company: input.personal.company || input.companies[0] || null,
              location: input.personal.location || null,
              addressLine: input.personal.addressLine || null,
              previousLocations: input.personal.previousLocations,
              publicAlias: input.aliases.publicAlias || null,
            },
          });

        await Promise.all([
          transaction
            .delete(profileAliases)
            .where(eq(profileAliases.userId, userId)),
          transaction
            .delete(profilePhoneNumbers)
            .where(eq(profilePhoneNumbers.userId, userId)),
          transaction
            .delete(profileAdditionalEmails)
            .where(eq(profileAdditionalEmails.userId, userId)),
          transaction
            .delete(socialAccounts)
            .where(eq(socialAccounts.userId, userId)),
          transaction
            .delete(digitalTraces)
            .where(eq(digitalTraces.userId, userId)),
          transaction
            .delete(profileImages)
            .where(eq(profileImages.userId, userId)),
        ]);

        const aliasRows = [
          ...(input.aliases.publicAlias
            ? [
                {
                  userId,
                  alias: input.aliases.publicAlias,
                  aliasType: "public_alias" as const,
                },
              ]
            : []),
          ...input.aliases.formerNames.map((alias) => ({
            userId,
            alias,
            aliasType: "former_name" as const,
          })),
          ...input.aliases.nicknames.map((alias) => ({
            userId,
            alias,
            aliasType: "nickname" as const,
          })),
          ...input.aliases.usernames.map((alias) => ({
            userId,
            alias,
            aliasType: "username" as const,
          })),
          ...input.aliases.gamingNames.map((alias) => ({
            userId,
            alias,
            aliasType: "gaming_name" as const,
          })),
        ];
        if (aliasRows.length) {
          await transaction.insert(profileAliases).values(aliasRows);
        }
        if (input.phoneNumbers.length) {
          await transaction
            .insert(profilePhoneNumbers)
            .values(
              input.phoneNumbers.map((phoneNumber) => ({ userId, phoneNumber }))
            );
        }
        if (input.emails.length) {
          await transaction
            .insert(profileAdditionalEmails)
            .values(input.emails.map((email) => ({ userId, email })));
        }
        if (input.socialAccounts.length) {
          await transaction.insert(socialAccounts).values(
            input.socialAccounts.map((account) => ({
              userId,
              platform: account.platform,
              username: account.username,
              profileUrl: account.profileUrl || null,
              accountStatus: account.accountStatus,
            }))
          );
        }

        const traceRows = [
          ...input.websites.map((value) => ({
            userId,
            traceType: "website" as const,
            value,
          })),
          ...input.domains.map((value) => ({
            userId,
            traceType: "domain" as const,
            value,
          })),
          ...input.companies.map((value) => ({
            userId,
            traceType: "company" as const,
            value,
          })),
        ];
        if (traceRows.length) {
          await transaction.insert(digitalTraces).values(traceRows);
        }

        if (input.images.length) {
          for (const image of input.images) {
            assertOwnedImagePath(userId, image.storagePath);
            if (image.originalPath)
              assertOwnedImagePath(userId, image.originalPath);
            if (image.analysisPath)
              assertOwnedImagePath(userId, image.analysisPath);
            if (image.thumbnailPath)
              assertOwnedImagePath(userId, image.thumbnailPath);
          }
          await transaction.insert(profileImages).values(
            input.images.map((image) => ({
              userId,
              imageType: image.imageType,
              storagePath: image.storagePath,
              originalPath: image.originalPath ?? null,
              analysisPath: image.analysisPath ?? null,
              thumbnailPath: image.thumbnailPath ?? null,
              contentHash: image.contentHash ?? null,
              mimeType: image.mimeType ?? null,
              byteSize: image.byteSize ?? null,
            }))
          );
        }
      });

      const snapshot = await this.getSnapshot(userId);
      if (!snapshot) {
        throw new Error("Identity snapshot missing after save.");
      }
      return snapshot;
    },
  };
}

export function createIdentityRepository(
  db: SynSightDatabase | null
): IdentityRepository {
  if (db) {
    return createMysqlIdentityRepository(db);
  }
  const profiles = createProfileRepository(null);
  return createInMemoryIdentityRepository(
    (userId) => profiles.findByUserId(userId),
    (userId, seed) => profiles.ensureDraft(userId, seed)
  );
}
