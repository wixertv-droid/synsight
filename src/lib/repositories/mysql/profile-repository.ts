import { eq } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { profiles } from "@/lib/database/schema";
import type { Profile } from "@/types/domain";
import {
  createInMemoryProfileRepository,
  type ProfileRepository,
} from "../profile-repository";

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

const mysqlDate = () => new Date().toISOString().slice(0, 23).replace("T", " ");

export function createMysqlProfileRepository(
  db: SynSightDatabase
): ProfileRepository {
  return {
    async findByUserId(userId) {
      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      return rows[0] ? mapProfile(rows[0]) : null;
    },

    async ensureDraft(userId, seed = {}) {
      const existing = await this.findByUserId(userId);
      if (existing) return existing;

      await db.insert(profiles).values({
        userId,
        firstName: seed.firstName || "User",
        lastName: seed.lastName || "Account",
        phone: seed.phone ?? null,
        company: seed.company ?? null,
        region: seed.region ?? "EU",
        locale: seed.locale ?? "de-DE",
        publicAlias: seed.publicAlias ?? null,
        onboardingStep: seed.onboardingStep ?? 0,
        onboardingCompletedAt: seed.onboardingCompletedAt ?? null,
      });

      const created = await this.findByUserId(userId);
      if (!created) {
        throw new Error("Failed to create profile draft.");
      }
      return created;
    },

    async update(userId, input) {
      await this.ensureDraft(userId, {
        firstName: input.firstName,
        lastName: input.lastName,
      });
      await db
        .update(profiles)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null,
          company: input.company || null,
          region: input.region,
        })
        .where(eq(profiles.userId, userId));
    },

    async markOnboardingComplete(userId, patch) {
      await this.ensureDraft(userId, patch);
      await db
        .update(profiles)
        .set({
          firstName: patch.firstName,
          lastName: patch.lastName,
          publicAlias: patch.publicAlias ?? null,
          phone: patch.phone ?? null,
          company: patch.company ?? null,
          region: patch.region ?? "EU",
          onboardingStep: 4,
          onboardingCompletedAt: patch.onboardingCompletedAt ?? mysqlDate(),
        })
        .where(eq(profiles.userId, userId));
    },
  };
}

export function createProfileRepository(
  db: SynSightDatabase | null
): ProfileRepository {
  if (db) {
    return createMysqlProfileRepository(db);
  }
  return createInMemoryProfileRepository();
}
