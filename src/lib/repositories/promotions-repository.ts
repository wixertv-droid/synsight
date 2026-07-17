export type PromotionLifecycle = "active" | "planned" | "expired" | "inactive";

export interface PromotionRecord {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  timezone: string;
  bonusCredits: number;
  promoCodeRequired: boolean;
  promoCode: string | null;
  newUsersOnly: boolean;
  existingUsersOnly: boolean;
  singleUsePerUser: boolean;
  maxParticipants: number | null;
  minBalance: number | null;
  budgetCredits: number | null;
  createdByAdminId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionRewardRecord {
  id: number;
  promotionId: number;
  userId: number;
  credits: number;
  creditTransactionId: number | null;
  promoCodeUsed: string | null;
  notificationShownAt: string | null;
  grantedAt: string;
}

export interface PromotionLogRecord {
  id: number;
  promotionId: number;
  userId: number;
  promotionRewardId: number | null;
  credits: number;
  reason: string;
  adminId: number | null;
  creditTransactionId: number | null;
  ipAddress: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
}

export interface PromotionStats {
  promotionId: number;
  participants: number;
  creditsGranted: number;
}

export interface PromotionUpsertInput {
  id?: number;
  name: string;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  timezone: string;
  bonusCredits: number;
  promoCodeRequired: boolean;
  promoCode: string | null;
  newUsersOnly: boolean;
  existingUsersOnly: boolean;
  singleUsePerUser: boolean;
  maxParticipants: number | null;
  minBalance: number | null;
  budgetCredits: number | null;
  adminId: number;
}

export interface PromotionsRepository {
  listPromotions(): Promise<PromotionRecord[]>;
  findPromotionById(id: number): Promise<PromotionRecord | null>;
  findPromotionByCode(code: string): Promise<PromotionRecord | null>;
  createPromotion(input: PromotionUpsertInput): Promise<PromotionRecord>;
  updatePromotion(
    id: number,
    input: PromotionUpsertInput
  ): Promise<PromotionRecord | null>;
  deletePromotion(id: number): Promise<boolean>;
  setPromotionActive(id: number, isActive: boolean): Promise<boolean>;
  listAutomaticPromotionsForNewUsers(): Promise<PromotionRecord[]>;
  countRewardsForPromotion(promotionId: number): Promise<number>;
  sumCreditsGrantedForPromotion(promotionId: number): Promise<number>;
  hasUserReceivedPromotion(
    userId: number,
    promotionId: number
  ): Promise<boolean>;
  countUserRewardsForPromotion(
    userId: number,
    promotionId: number
  ): Promise<number>;
  createReward(input: {
    promotionId: number;
    userId: number;
    credits: number;
    creditTransactionId: number | null;
    promoCodeUsed?: string | null;
  }): Promise<PromotionRewardRecord>;
  createLog(input: {
    promotionId: number;
    userId: number;
    promotionRewardId: number | null;
    credits: number;
    reason: string;
    adminId: number | null;
    creditTransactionId: number | null;
    ipAddress?: string | null;
    metadataJson?: Record<string, unknown> | null;
  }): Promise<PromotionLogRecord>;
  listPendingNotifications(userId: number): Promise<
    Array<{
      rewardId: number;
      promotionId: number;
      promotionName: string;
      credits: number;
      grantedAt: string;
    }>
  >;
  markNotificationShown(rewardId: number, userId: number): Promise<boolean>;
  getPromotionStats(): Promise<PromotionStats[]>;
}

function promotionsStore(): PromotionRecord[] {
  const g = globalThis as typeof globalThis & {
    __synsightPromotions?: PromotionRecord[];
    __synsightPromotionId?: number;
  };
  if (!g.__synsightPromotions) {
    g.__synsightPromotions = [
      {
        id: 1,
        name: "Willkommensbonus",
        description:
          "Automatische Gutschrift für neue Benutzer nach erfolgreicher E-Mail-Verifizierung.",
        isActive: true,
        startsAt: null,
        endsAt: null,
        timeFrom: null,
        timeTo: null,
        timezone: "Europe/Berlin",
        bonusCredits: 250,
        promoCodeRequired: false,
        promoCode: null,
        newUsersOnly: true,
        existingUsersOnly: false,
        singleUsePerUser: true,
        maxParticipants: null,
        minBalance: null,
        budgetCredits: null,
        createdByAdminId: null,
        createdAt: new Date().toISOString().slice(0, 23).replace("T", " "),
        updatedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
      },
    ];
    g.__synsightPromotionId = 1;
  }
  return g.__synsightPromotions;
}

function rewardsStore(): PromotionRewardRecord[] {
  const g = globalThis as typeof globalThis & {
    __synsightPromotionRewards?: PromotionRewardRecord[];
    __synsightPromotionRewardId?: number;
  };
  if (!g.__synsightPromotionRewards) g.__synsightPromotionRewards = [];
  return g.__synsightPromotionRewards;
}

function logsStore(): PromotionLogRecord[] {
  const g = globalThis as typeof globalThis & {
    __synsightPromotionLogs?: PromotionLogRecord[];
    __synsightPromotionLogId?: number;
  };
  if (!g.__synsightPromotionLogs) g.__synsightPromotionLogs = [];
  return g.__synsightPromotionLogs;
}

function nextPromotionId(): number {
  const g = globalThis as typeof globalThis & {
    __synsightPromotionId?: number;
  };
  g.__synsightPromotionId = (g.__synsightPromotionId ?? 0) + 1;
  return g.__synsightPromotionId;
}

function nextRewardId(): number {
  const g = globalThis as typeof globalThis & {
    __synsightPromotionRewardId?: number;
  };
  g.__synsightPromotionRewardId = (g.__synsightPromotionRewardId ?? 0) + 1;
  return g.__synsightPromotionRewardId;
}

function nextLogId(): number {
  const g = globalThis as typeof globalThis & {
    __synsightPromotionLogId?: number;
  };
  g.__synsightPromotionLogId = (g.__synsightPromotionLogId ?? 0) + 1;
  return g.__synsightPromotionLogId;
}

export function createInMemoryPromotionsRepository(): PromotionsRepository {
  return {
    async listPromotions() {
      return [...promotionsStore()].sort((a, b) => b.id - a.id);
    },
    async findPromotionById(id) {
      return promotionsStore().find((entry) => entry.id === id) ?? null;
    },
    async findPromotionByCode(code) {
      const normalized = code.trim().toUpperCase();
      return (
        promotionsStore().find(
          (entry) =>
            entry.promoCode?.trim().toUpperCase() === normalized && normalized
        ) ?? null
      );
    },
    async createPromotion(input) {
      const now = new Date().toISOString().slice(0, 23).replace("T", " ");
      const record: PromotionRecord = {
        id: nextPromotionId(),
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
        createdAt: now,
        updatedAt: now,
      };
      promotionsStore().push(record);
      return record;
    },
    async updatePromotion(id, input) {
      const store = promotionsStore();
      const index = store.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const now = new Date().toISOString().slice(0, 23).replace("T", " ");
      store[index] = {
        ...store[index],
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
        updatedAt: now,
      };
      return store[index];
    },
    async deletePromotion(id) {
      const store = promotionsStore();
      const index = store.findIndex((entry) => entry.id === id);
      if (index < 0) return false;
      store.splice(index, 1);
      return true;
    },
    async setPromotionActive(id, isActive) {
      const promotion = await this.findPromotionById(id);
      if (!promotion) return false;
      promotion.isActive = isActive;
      promotion.updatedAt = new Date()
        .toISOString()
        .slice(0, 23)
        .replace("T", " ");
      return true;
    },
    async listAutomaticPromotionsForNewUsers() {
      return promotionsStore().filter(
        (entry) =>
          entry.isActive &&
          entry.newUsersOnly &&
          !entry.existingUsersOnly &&
          !entry.promoCodeRequired &&
          entry.bonusCredits > 0
      );
    },
    async countRewardsForPromotion(promotionId) {
      return rewardsStore().filter((entry) => entry.promotionId === promotionId)
        .length;
    },
    async sumCreditsGrantedForPromotion(promotionId) {
      return rewardsStore()
        .filter((entry) => entry.promotionId === promotionId)
        .reduce((sum, entry) => sum + entry.credits, 0);
    },
    async hasUserReceivedPromotion(userId, promotionId) {
      return rewardsStore().some(
        (entry) => entry.userId === userId && entry.promotionId === promotionId
      );
    },
    async countUserRewardsForPromotion(userId, promotionId) {
      return rewardsStore().filter(
        (entry) => entry.userId === userId && entry.promotionId === promotionId
      ).length;
    },
    async createReward(input) {
      const record: PromotionRewardRecord = {
        id: nextRewardId(),
        promotionId: input.promotionId,
        userId: input.userId,
        credits: input.credits,
        creditTransactionId: input.creditTransactionId,
        promoCodeUsed: input.promoCodeUsed ?? null,
        notificationShownAt: null,
        grantedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
      };
      rewardsStore().push(record);
      return record;
    },
    async createLog(input) {
      const record: PromotionLogRecord = {
        id: nextLogId(),
        promotionId: input.promotionId,
        userId: input.userId,
        promotionRewardId: input.promotionRewardId,
        credits: input.credits,
        reason: input.reason,
        adminId: input.adminId,
        creditTransactionId: input.creditTransactionId,
        ipAddress: input.ipAddress ?? null,
        metadataJson: input.metadataJson ?? null,
        createdAt: new Date().toISOString().slice(0, 23).replace("T", " "),
      };
      logsStore().push(record);
      return record;
    },
    async listPendingNotifications(userId) {
      const promotions = promotionsStore();
      return rewardsStore()
        .filter(
          (entry) =>
            entry.userId === userId && entry.notificationShownAt === null
        )
        .map((entry) => {
          const promotion = promotions.find((p) => p.id === entry.promotionId);
          return {
            rewardId: entry.id,
            promotionId: entry.promotionId,
            promotionName: promotion?.name ?? "Aktion",
            credits: entry.credits,
            grantedAt: entry.grantedAt,
          };
        });
    },
    async markNotificationShown(rewardId, userId) {
      const reward = rewardsStore().find(
        (entry) => entry.id === rewardId && entry.userId === userId
      );
      if (!reward) return false;
      reward.notificationShownAt = new Date()
        .toISOString()
        .slice(0, 23)
        .replace("T", " ");
      return true;
    },
    async getPromotionStats() {
      const stats = new Map<number, PromotionStats>();
      for (const reward of rewardsStore()) {
        const current = stats.get(reward.promotionId) ?? {
          promotionId: reward.promotionId,
          participants: 0,
          creditsGranted: 0,
        };
        current.participants += 1;
        current.creditsGranted += reward.credits;
        stats.set(reward.promotionId, current);
      }
      return [...stats.values()];
    },
  };
}
