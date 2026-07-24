import { eq, inArray, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { analysisPricing, creditPackages } from "@/lib/database/schema";
import { REPLACED_ANALYSIS_KEYS } from "@/lib/credits/pricing";
import {
  createInMemoryPricingRepository,
  type ManagedCreditPackageRecord,
  type PricingRepository,
} from "../pricing-repository";

export function createMysqlPricingRepository(
  db: SynSightDatabase
): PricingRepository {
  return {
    async listAnalyses(activeOnly = true) {
      let query = db.select().from(analysisPricing).$dynamic();
      if (activeOnly) query = query.where(eq(analysisPricing.isActive, true));
      return query.orderBy(analysisPricing.sortOrder);
    },
    async findAnalysisByKey(key) {
      const rows = await db
        .select()
        .from(analysisPricing)
        .where(eq(analysisPricing.analysisKey, key))
        .limit(1);
      return rows[0] ?? null;
    },
    async upsertAnalysis(input) {
      await db
        .insert(analysisPricing)
        .values({
          analysisKey: input.analysisKey,
          label: input.label,
          description: input.description,
          credits: input.credits,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          isSystemDefault: false,
          updatedByAdminId: input.adminId,
        })
        .onDuplicateKeyUpdate({
          set: {
            label: input.label,
            description: input.description,
            credits: input.credits,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
            updatedByAdminId: input.adminId,
          },
        });
      const row = await this.findAnalysisByKey(input.analysisKey);
      if (!row) throw new Error("PRICING_UPSERT_FAILED");
      return row;
    },
    async resetAnalyses(adminId) {
      await db
        .update(analysisPricing)
        .set({
          label: sql`COALESCE(${analysisPricing.defaultLabel}, ${analysisPricing.label})`,
          description: sql`${analysisPricing.defaultDescription}`,
          credits: sql`COALESCE(${analysisPricing.defaultCredits}, ${analysisPricing.credits})`,
          isActive: true,
          updatedByAdminId: adminId,
        })
        .where(eq(analysisPricing.isSystemDefault, true));

      // Keep modules replaced by digital_leak_exposure inactive after reset
      await db
        .update(analysisPricing)
        .set({
          isActive: false,
          updatedByAdminId: adminId,
        })
        .where(
          inArray(analysisPricing.analysisKey, [...REPLACED_ANALYSIS_KEYS])
        );
    },
    async listManagedPackages(activeOnly = true) {
      let query = db.select().from(creditPackages).$dynamic();
      if (activeOnly) query = query.where(eq(creditPackages.isActive, true));
      const rows = await query.orderBy(creditPackages.sortOrder);
      return rows as ManagedCreditPackageRecord[];
    },
    async updatePackage(input) {
      if (input.isPopular) {
        await db
          .update(creditPackages)
          .set({ isPopular: false })
          .where(eq(creditPackages.isPopular, true));
      }
      const result = await db
        .update(creditPackages)
        .set({
          name: input.name,
          credits: input.credits,
          bonusCredits: input.bonusCredits,
          priceCents: input.priceCents,
          currency: input.currency,
          badge: input.badge,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          isPopular: input.isPopular,
          updatedByAdminId: input.adminId,
        })
        .where(eq(creditPackages.code, input.code));
      if (Number(result[0].affectedRows) !== 1) return null;
      const rows = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.code, input.code))
        .limit(1);
      return (rows[0] as ManagedCreditPackageRecord | undefined) ?? null;
    },
    async resetPackages(adminId) {
      await db
        .update(creditPackages)
        .set({
          credits: sql`COALESCE(${creditPackages.defaultCredits}, ${creditPackages.credits})`,
          bonusCredits: sql`COALESCE(${creditPackages.defaultBonusCredits}, ${creditPackages.bonusCredits})`,
          priceCents: sql`COALESCE(${creditPackages.defaultPriceCents}, ${creditPackages.priceCents})`,
          isActive: true,
          isPopular: sql`${creditPackages.code} = 'pack_3600'`,
          updatedByAdminId: adminId,
        })
        .where(sql`${creditPackages.defaultPriceCents} IS NOT NULL`);
    },
  };
}

export function createPricingRepository(
  db: SynSightDatabase | null
): PricingRepository {
  return db
    ? createMysqlPricingRepository(db)
    : createInMemoryPricingRepository();
}
