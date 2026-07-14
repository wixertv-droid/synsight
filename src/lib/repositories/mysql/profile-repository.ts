import { eq } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { profiles } from "@/lib/database/schema";
import type { Profile } from "@/types/domain";
import {
  createInMemoryProfileRepository,
  type ProfileRepository,
} from "../profile-repository";

function mapProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    company: row.company,
    region: row.region,
    locale: row.locale,
    publicAlias: row.publicAlias,
    onboardingStep: row.onboardingStep,
    onboardingCompletedAt: row.onboardingCompletedAt,
  };
}

export function createMysqlProfileRepository(db: SynSightDatabase): ProfileRepository {
  return {
    async findByUserId(userId) {
      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      return rows[0] ? mapProfile(rows[0]) : null;
    },
  };
}

export function createProfileRepository(db: SynSightDatabase | null): ProfileRepository {
  if (db) {
    return createMysqlProfileRepository(db);
  }
  return createInMemoryProfileRepository();
}
