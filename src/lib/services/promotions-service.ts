import type { AuthenticatedUser } from "@/lib/auth/types";
import {
  getAuditRepository,
  getCreditsRepository,
  getPromotionsRepository,
} from "@/lib/repositories";
import type {
  PromotionLifecycle,
  PromotionRecord,
  PromotionUpsertInput,
} from "@/lib/repositories/promotions-repository";

export class AdminForbiddenError extends Error {
  constructor() {
    super("ADMIN_FORBIDDEN");
  }
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new AdminForbiddenError();
}

function toDateOnlyInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toTimeInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function resolvePromotionLifecycle(
  promotion: PromotionRecord,
  now = new Date()
): PromotionLifecycle {
  if (!promotion.isActive) return "inactive";

  const timezone = promotion.timezone || "Europe/Berlin";
  const today = toDateOnlyInTimezone(now, timezone);

  if (promotion.startsAt && today < promotion.startsAt) return "planned";
  if (promotion.endsAt && today > promotion.endsAt) return "expired";

  if (promotion.timeFrom && promotion.timeTo) {
    const currentTime = toTimeInTimezone(now, timezone);
    if (currentTime < promotion.timeFrom || currentTime > promotion.timeTo) {
      return "inactive";
    }
  }

  return "active";
}

export function isPromotionCurrentlyActive(
  promotion: PromotionRecord,
  now = new Date()
): boolean {
  return resolvePromotionLifecycle(promotion, now) === "active";
}

async function canGrantPromotion(
  promotion: PromotionRecord,
  userId: number,
  options: {
    isNewUser: boolean;
    currentBalance: number;
    promoCode?: string | null;
  }
): Promise<{ eligible: boolean; reason?: string }> {
  if (!isPromotionCurrentlyActive(promotion)) {
    return { eligible: false, reason: "PROMOTION_NOT_ACTIVE" };
  }

  if (promotion.newUsersOnly && !options.isNewUser) {
    return { eligible: false, reason: "NEW_USERS_ONLY" };
  }

  if (promotion.existingUsersOnly && options.isNewUser) {
    return { eligible: false, reason: "EXISTING_USERS_ONLY" };
  }

  if (promotion.promoCodeRequired) {
    const provided = options.promoCode?.trim().toUpperCase() ?? "";
    const expected = promotion.promoCode?.trim().toUpperCase() ?? "";
    if (!provided || provided !== expected) {
      return { eligible: false, reason: "PROMO_CODE_REQUIRED" };
    }
  }

  const repository = getPromotionsRepository();
  const userRewards = await repository.countUserRewardsForPromotion(
    userId,
    promotion.id
  );
  if (promotion.singleUsePerUser && userRewards > 0) {
    return { eligible: false, reason: "ALREADY_REDEEMED" };
  }

  if (
    promotion.maxParticipants !== null &&
    (await repository.countRewardsForPromotion(promotion.id)) >=
      promotion.maxParticipants
  ) {
    return { eligible: false, reason: "MAX_PARTICIPANTS_REACHED" };
  }

  if (
    promotion.minBalance !== null &&
    options.currentBalance < promotion.minBalance
  ) {
    return { eligible: false, reason: "MIN_BALANCE_NOT_MET" };
  }

  if (promotion.budgetCredits !== null) {
    const granted = await repository.sumCreditsGrantedForPromotion(
      promotion.id
    );
    if (granted + promotion.bonusCredits > promotion.budgetCredits) {
      return { eligible: false, reason: "BUDGET_EXCEEDED" };
    }
  }

  return { eligible: true };
}

export async function grantPromotionCredits(input: {
  promotion: PromotionRecord;
  userId: number;
  reason: string;
  adminId?: number | null;
  promoCodeUsed?: string | null;
  ipAddress?: string | null;
  metadataJson?: Record<string, unknown> | null;
}) {
  const creditsRepository = getCreditsRepository();
  const promotionsRepository = getPromotionsRepository();

  await creditsRepository.ensureAccount(input.userId);
  const result = await creditsRepository.applyCreditChange({
    userId: input.userId,
    type: "bonus",
    amount: input.promotion.bonusCredits,
    description: `Promotion: ${input.promotion.name}`,
    transactionSource: "promotion",
    reason: input.reason,
    performedBy: input.adminId ?? null,
    metadataJson: {
      promotionId: input.promotion.id,
      promotionName: input.promotion.name,
      ...(input.metadataJson ?? {}),
    },
  });

  const reward = await promotionsRepository.createReward({
    promotionId: input.promotion.id,
    userId: input.userId,
    credits: input.promotion.bonusCredits,
    creditTransactionId: result.transaction.id,
    promoCodeUsed: input.promoCodeUsed ?? null,
  });

  await promotionsRepository.createLog({
    promotionId: input.promotion.id,
    userId: input.userId,
    promotionRewardId: reward.id,
    credits: input.promotion.bonusCredits,
    reason: input.reason,
    adminId: input.adminId ?? null,
    creditTransactionId: result.transaction.id,
    ipAddress: input.ipAddress ?? null,
    metadataJson: input.metadataJson ?? null,
  });

  await getAuditRepository().create({
    userId: input.userId,
    eventType: "promotion.granted",
    entityType: "promotion",
    entityId: String(input.promotion.id),
    ipAddress: input.ipAddress ?? null,
    metadata: {
      promotionId: input.promotion.id,
      promotionName: input.promotion.name,
      credits: input.promotion.bonusCredits,
      transactionId: result.transaction.id,
      rewardId: reward.id,
    },
  });

  return {
    promotionId: input.promotion.id,
    promotionName: input.promotion.name,
    credits: input.promotion.bonusCredits,
    balance: result.account.balance,
    transactionId: result.transaction.id,
    rewardId: reward.id,
  };
}

export async function processAutomaticNewUserPromotions(input: {
  userId: number;
  ipAddress?: string | null;
}) {
  const repository = getPromotionsRepository();
  const creditsRepository = getCreditsRepository();
  const account = await creditsRepository.ensureAccount(input.userId);
  const promotions = await repository.listAutomaticPromotionsForNewUsers();
  const granted: Array<{
    promotionId: number;
    promotionName: string;
    credits: number;
    transactionId: number;
    rewardId: number;
  }> = [];

  for (const promotion of promotions) {
    const eligibility = await canGrantPromotion(promotion, input.userId, {
      isNewUser: true,
      currentBalance: account.balance,
    });
    if (!eligibility.eligible) continue;

    const result = await grantPromotionCredits({
      promotion,
      userId: input.userId,
      reason: "Automatische Willkommensaktion nach E-Mail-Verifizierung",
      ipAddress: input.ipAddress,
      metadataJson: { trigger: "email_verification" },
    });
    granted.push(result);
    account.balance = result.balance;
  }

  return granted;
}

export async function getPendingPromotionNotifications(userId: number) {
  return getPromotionsRepository().listPendingNotifications(userId);
}

export async function acknowledgePromotionNotification(
  userId: number,
  rewardId: number
) {
  return getPromotionsRepository().markNotificationShown(rewardId, userId);
}

export async function getAdminPromotionsCatalog(actor: AuthenticatedUser) {
  assertAdmin(actor);
  const repository = getPromotionsRepository();
  const [promotions, stats] = await Promise.all([
    repository.listPromotions(),
    repository.getPromotionStats(),
  ]);
  const statsMap = new Map(stats.map((entry) => [entry.promotionId, entry]));

  return promotions.map((promotion) => {
    const stat = statsMap.get(promotion.id);
    const lifecycle = resolvePromotionLifecycle(promotion);
    const creditsGranted = stat?.creditsGranted ?? 0;
    const remainingBudget =
      promotion.budgetCredits !== null
        ? Math.max(0, promotion.budgetCredits - creditsGranted)
        : null;

    return {
      ...promotion,
      lifecycle,
      participants: stat?.participants ?? 0,
      creditsGranted,
      remainingBudget,
    };
  });
}

export async function createPromotion(input: {
  actor: AuthenticatedUser;
  data: Omit<PromotionUpsertInput, "adminId">;
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);
  const repository = getPromotionsRepository();
  const adminId = Number(input.actor.id);

  if (input.data.newUsersOnly && input.data.existingUsersOnly) {
    throw new Error("INVALID_PROMOTION_TARGETING");
  }

  if (input.data.promoCodeRequired && !input.data.promoCode?.trim()) {
    throw new Error("PROMO_CODE_REQUIRED");
  }

  const promotion = await repository.createPromotion({
    ...input.data,
    promoCode: input.data.promoCode?.trim().toUpperCase() || null,
    adminId,
  });

  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "promotion",
    entityId: String(promotion.id),
    ipAddress: input.ipAddress ?? null,
    metadata: {
      action: "promotion.create",
      promotionId: promotion.id,
      name: promotion.name,
    },
  });

  return promotion;
}

export async function updatePromotion(input: {
  actor: AuthenticatedUser;
  id: number;
  data: Omit<PromotionUpsertInput, "adminId">;
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);
  const repository = getPromotionsRepository();
  const adminId = Number(input.actor.id);

  if (input.data.newUsersOnly && input.data.existingUsersOnly) {
    throw new Error("INVALID_PROMOTION_TARGETING");
  }

  const promotion = await repository.updatePromotion(input.id, {
    ...input.data,
    promoCode: input.data.promoCode?.trim().toUpperCase() || null,
    adminId,
  });
  if (!promotion) return { status: "not_found" as const };

  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "promotion",
    entityId: String(promotion.id),
    ipAddress: input.ipAddress ?? null,
    metadata: {
      action: "promotion.update",
      promotionId: promotion.id,
      name: promotion.name,
    },
  });

  return { status: "updated" as const, promotion };
}

export async function setPromotionActiveState(input: {
  actor: AuthenticatedUser;
  id: number;
  isActive: boolean;
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);
  const repository = getPromotionsRepository();
  const adminId = Number(input.actor.id);
  const updated = await repository.setPromotionActive(input.id, input.isActive);
  if (!updated) return { status: "not_found" as const };

  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "promotion",
    entityId: String(input.id),
    ipAddress: input.ipAddress ?? null,
    metadata: {
      action: input.isActive ? "promotion.activate" : "promotion.deactivate",
      promotionId: input.id,
    },
  });

  return { status: "updated" as const, isActive: input.isActive };
}

export async function deletePromotion(input: {
  actor: AuthenticatedUser;
  id: number;
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);
  const repository = getPromotionsRepository();
  const adminId = Number(input.actor.id);
  const deleted = await repository.deletePromotion(input.id);
  if (!deleted) return { status: "not_found" as const };

  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "promotion",
    entityId: String(input.id),
    ipAddress: input.ipAddress ?? null,
    metadata: { action: "promotion.delete", promotionId: input.id },
  });

  return { status: "deleted" as const };
}
