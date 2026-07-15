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
import {
  createInMemoryOnboardingRepository,
  type OnboardingRepository,
} from "../onboarding-repository";
import type { OnboardingPayload } from "@/lib/validation/onboarding";

const mysqlDate = () => new Date().toISOString().slice(0, 23).replace("T", " ");

function buildDigitalTraceRows(userId: number, payload: OnboardingPayload) {
  return [
    ...payload.additionalData.websites.map((value) => ({
      userId,
      traceType: "website" as const,
      value,
    })),
    ...payload.additionalData.domains.map((value) => ({
      userId,
      traceType: "domain" as const,
      value,
    })),
    ...payload.additionalData.companies.map((value) => ({
      userId,
      traceType: "company" as const,
      value,
    })),
    ...payload.additionalData.publicProfiles.map((value) => ({
      userId,
      traceType: "public_profile" as const,
      value,
    })),
  ];
}

export function createMysqlOnboardingRepository(
  db: SynSightDatabase
): OnboardingRepository {
  return {
    async save(userId, payload) {
      await db.transaction(async (transaction) => {
        await transaction
          .update(profiles)
          .set({
            firstName: payload.identity.firstName,
            lastName: payload.identity.lastName,
            publicAlias: payload.identity.publicAlias || null,
            phone: payload.identity.phoneNumbers[0] || null,
            company: payload.additionalData.companies[0] || null,
            region:
              [payload.identity.city, payload.identity.country]
                .filter(Boolean)
                .join(", ") || "EU",
            onboardingStep: 4,
            onboardingCompletedAt: mysqlDate(),
          })
          .where(eq(profiles.userId, userId));

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
            .delete(profileImages)
            .where(eq(profileImages.userId, userId)),
          transaction
            .delete(digitalTraces)
            .where(eq(digitalTraces.userId, userId)),
        ]);

        const aliases = [
          ...(payload.identity.publicAlias
            ? [
                {
                  userId,
                  alias: payload.identity.publicAlias,
                  aliasType: "public_alias" as const,
                },
              ]
            : []),
          ...payload.identity.formerNames.map((alias) => ({
            userId,
            alias,
            aliasType: "former_name" as const,
          })),
          ...payload.identity.nicknames.map((alias) => ({
            userId,
            alias,
            aliasType: "nickname" as const,
          })),
          ...payload.additionalData.oldUsernames.map((alias) => ({
            userId,
            alias,
            aliasType: "username" as const,
          })),
          ...payload.additionalData.gamingNames.map((alias) => ({
            userId,
            alias,
            aliasType: "gaming_name" as const,
          })),
        ];

        if (aliases.length) {
          await transaction.insert(profileAliases).values(aliases);
        }
        if (payload.identity.phoneNumbers.length) {
          await transaction.insert(profilePhoneNumbers).values(
            payload.identity.phoneNumbers.map((phoneNumber) => ({
              userId,
              phoneNumber,
            }))
          );
        }
        if (payload.identity.additionalEmails.length) {
          await transaction.insert(profileAdditionalEmails).values(
            payload.identity.additionalEmails.map((email) => ({
              userId,
              email,
            }))
          );
        }
        if (payload.digitalIdentity.socialAccounts.length) {
          await transaction.insert(socialAccounts).values(
            payload.digitalIdentity.socialAccounts.map((account) => ({
              userId,
              platform: account.platform,
              username: account.username,
              profileUrl: account.profileUrl || null,
            }))
          );
        }

        const traces = buildDigitalTraceRows(userId, payload);
        if (traces.length) {
          await transaction.insert(digitalTraces).values(traces);
        }

        if (payload.imageProfile.images.length) {
          await transaction.insert(profileImages).values(
            payload.imageProfile.images.map((image) => ({
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
    },
  };
}

export function createOnboardingRepository(
  db: SynSightDatabase | null
): OnboardingRepository {
  return db
    ? createMysqlOnboardingRepository(db)
    : createInMemoryOnboardingRepository();
}
