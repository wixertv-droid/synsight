import { and, eq, isNull, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import {
  promotionLogs,
  promotionRewards,
  promotions,
} from "@/lib/database/schema";
import {
  createInMemoryPromotionsRepository,
  type PromotionRecord,
  type PromotionsRepository,
  type PromotionUpsertInput,
} from "../promotions-repository";

function mapPromotion(row: typeof promotions.$inferSelect): PromotionRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    timeFrom: row.timeFrom,
    timeTo: row.timeTo,
    timezone: row.timezone,
    bonusCredits: row.bonusCredits,
    promoCodeRequired: row.promoCodeRequired,
    promoCode: row.promoCode,
    newUsersOnly: row.newUsersOnly,
    existingUsersOnly: row.existingUsersOnly,
    singleUsePerUser: row.singleUsePerUser,
    maxParticipants: row.maxParticipants,
    minBalance: row.minBalance,
    budgetCredits: row.budgetCredits,
    createdByAdminId: row.createdByAdminId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function promotionValues(input: PromotionUpsertInput) {
  return {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timeFrom: input.timeFrom,
    timeTo: input.timeTo,
    timezone: input.timezone,
    bonusCredits: input.bonusCredits,
    promoCodeRequired: input.promoCodeRequired,
    promoCode: input.promoCode,
    newUsersOnly: input.newUsersOnly,
    existingUsersOnly: input.existingUsersOnly,
    singleUsePerUser: input.singleUsePerUser,
    maxParticipants: input.maxParticipants,
    minBalance: input.minBalance,
    budgetCredits: input.budgetCredits,
    createdByAdminId: input.adminId,
  };
}

export function createMysqlPromotionsRepository(
  db: SynSightDatabase
): PromotionsRepository {
  return {
    async listPromotions() {
      const rows = await db
        .select()
        .from(promotions)
        .orderBy(sql`${promotions.id} DESC`);
      return rows.map(mapPromotion);
    },
    async findPromotionById(id) {
      const rows = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, id))
        .limit(1);
      return rows[0] ? mapPromotion(rows[0]) : null;
    },
    async findPromotionByCode(code) {
      const normalized = code.trim().toUpperCase();
      if (!normalized) return null;
      const rows = await db
        .select()
        .from(promotions)
        .where(eq(promotions.promoCode, normalized))
        .limit(1);
      return rows[0] ? mapPromotion(rows[0]) : null;
    },
    async createPromotion(input) {
      const result = await db.insert(promotions).values(promotionValues(input));
      const id = Number(result[0].insertId);
      const created = await this.findPromotionById(id);
      if (!created) throw new Error("PROMOTION_CREATE_FAILED");
      return created;
    },
    async updatePromotion(id, input) {
      const result = await db
        .update(promotions)
        .set(promotionValues(input))
        .where(eq(promotions.id, id));
      if (Number(result[0].affectedRows) !== 1) return null;
      return this.findPromotionById(id);
    },
    async deletePromotion(id) {
      const result = await db.delete(promotions).where(eq(promotions.id, id));
      return Number(result[0].affectedRows) === 1;
    },
    async setPromotionActive(id, isActive) {
      const result = await db
        .update(promotions)
        .set({ isActive })
        .where(eq(promotions.id, id));
      return Number(result[0].affectedRows) === 1;
    },
    async listAutomaticPromotionsForNewUsers() {
      const rows = await db
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.isActive, true),
            eq(promotions.newUsersOnly, true),
            eq(promotions.existingUsersOnly, false),
            eq(promotions.promoCodeRequired, false),
            sql`${promotions.bonusCredits} > 0`
          )
        );
      return rows.map(mapPromotion);
    },
    async countRewardsForPromotion(promotionId) {
      const rows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(promotionRewards)
        .where(eq(promotionRewards.promotionId, promotionId));
      return Number(rows[0]?.count ?? 0);
    },
    async sumCreditsGrantedForPromotion(promotionId) {
      const rows = await db
        .select({
          total: sql<number>`COALESCE(SUM(${promotionRewards.credits}), 0)`,
        })
        .from(promotionRewards)
        .where(eq(promotionRewards.promotionId, promotionId));
      return Number(rows[0]?.total ?? 0);
    },
    async hasUserReceivedPromotion(userId, promotionId) {
      const rows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(promotionRewards)
        .where(
          and(
            eq(promotionRewards.userId, userId),
            eq(promotionRewards.promotionId, promotionId)
          )
        );
      return Number(rows[0]?.count ?? 0) > 0;
    },
    async countUserRewardsForPromotion(userId, promotionId) {
      const rows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(promotionRewards)
        .where(
          and(
            eq(promotionRewards.userId, userId),
            eq(promotionRewards.promotionId, promotionId)
          )
        );
      return Number(rows[0]?.count ?? 0);
    },
    async createReward(input) {
      const result = await db.insert(promotionRewards).values({
        promotionId: input.promotionId,
        userId: input.userId,
        credits: input.credits,
        creditTransactionId: input.creditTransactionId,
        promoCodeUsed: input.promoCodeUsed ?? null,
      });
      const id = Number(result[0].insertId);
      const rows = await db
        .select()
        .from(promotionRewards)
        .where(eq(promotionRewards.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) throw new Error("PROMOTION_REWARD_CREATE_FAILED");
      return {
        id: row.id,
        promotionId: row.promotionId,
        userId: row.userId,
        credits: row.credits,
        creditTransactionId: row.creditTransactionId,
        promoCodeUsed: row.promoCodeUsed,
        notificationShownAt: row.notificationShownAt,
        grantedAt: row.grantedAt,
      };
    },
    async createLog(input) {
      const result = await db.insert(promotionLogs).values({
        promotionId: input.promotionId,
        userId: input.userId,
        promotionRewardId: input.promotionRewardId,
        credits: input.credits,
        reason: input.reason,
        adminId: input.adminId,
        creditTransactionId: input.creditTransactionId,
        ipAddress: input.ipAddress ?? null,
        metadataJson: input.metadataJson ?? null,
      });
      const id = Number(result[0].insertId);
      const rows = await db
        .select()
        .from(promotionLogs)
        .where(eq(promotionLogs.id, id))
        .limit(1);
      const row = rows[0];
      if (!row) throw new Error("PROMOTION_LOG_CREATE_FAILED");
      return {
        id: row.id,
        promotionId: row.promotionId,
        userId: row.userId,
        promotionRewardId: row.promotionRewardId,
        credits: row.credits,
        reason: row.reason,
        adminId: row.adminId,
        creditTransactionId: row.creditTransactionId,
        ipAddress: row.ipAddress,
        metadataJson: row.metadataJson as Record<string, unknown> | null,
        createdAt: row.createdAt,
      };
    },
    async listPendingNotifications(userId) {
      const rows = await db
        .select({
          rewardId: promotionRewards.id,
          promotionId: promotionRewards.promotionId,
          promotionName: promotions.name,
          credits: promotionRewards.credits,
          grantedAt: promotionRewards.grantedAt,
        })
        .from(promotionRewards)
        .innerJoin(promotions, eq(promotionRewards.promotionId, promotions.id))
        .where(
          and(
            eq(promotionRewards.userId, userId),
            isNull(promotionRewards.notificationShownAt)
          )
        );
      return rows;
    },
    async markNotificationShown(rewardId, userId) {
      const result = await db
        .update(promotionRewards)
        .set({
          notificationShownAt: sql`CURRENT_TIMESTAMP(3)`,
        })
        .where(
          and(
            eq(promotionRewards.id, rewardId),
            eq(promotionRewards.userId, userId)
          )
        );
      return Number(result[0].affectedRows) === 1;
    },
    async getPromotionStats() {
      const rows = await db
        .select({
          promotionId: promotionRewards.promotionId,
          participants: sql<number>`COUNT(*)`,
          creditsGranted: sql<number>`COALESCE(SUM(${promotionRewards.credits}), 0)`,
        })
        .from(promotionRewards)
        .groupBy(promotionRewards.promotionId);
      return rows.map((row) => ({
        promotionId: row.promotionId,
        participants: Number(row.participants),
        creditsGranted: Number(row.creditsGranted),
      }));
    },
  };
}

export function createPromotionsRepository(
  db: SynSightDatabase | null
): PromotionsRepository {
  return db
    ? createMysqlPromotionsRepository(db)
    : createInMemoryPromotionsRepository();
}
