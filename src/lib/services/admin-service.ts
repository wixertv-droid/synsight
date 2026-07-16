import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabaseHealth } from "@/lib/database/client";
import { getAdminRepository, getAuditRepository } from "@/lib/repositories";
import {
  adminGrantCredits,
  adminRevokeCredits,
  getCreditsHistory,
  getCreditsOverview,
} from "@/lib/services/credits-service";

export class AdminForbiddenError extends Error {
  constructor() {
    super("ADMIN_FORBIDDEN");
  }
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new AdminForbiddenError();
}

export async function searchAdminUsers(
  actor: AuthenticatedUser,
  query: string,
  limit = 25
) {
  assertAdmin(actor);
  const safeLimit = Math.min(100, Math.max(1, limit));
  return getAdminRepository().searchUsers(query.slice(0, 150), safeLimit);
}

export async function getAdminUserDetail(
  actor: AuthenticatedUser,
  userId: number
) {
  assertAdmin(actor);
  const user = await getAdminRepository().findUserById(userId);
  if (!user) return null;

  const [credits, transactions] = await Promise.all([
    getCreditsOverview(userId),
    getCreditsHistory(userId, 20),
  ]);
  return { user, credits, transactions };
}

export async function getAdminSystemStatus(actor: AuthenticatedUser) {
  assertAdmin(actor);
  const [stats, database] = await Promise.all([
    getAdminRepository().getSystemStats(),
    getDatabaseHealth(),
  ]);

  return {
    systemStatus: database.reachable ? "operational" : "degraded",
    serverStatus: "online",
    databaseStatus: database.reachable
      ? "connected"
      : database.configured
        ? "unreachable"
        : "not_configured",
    databaseDriver: database.driver,
    version: process.env.npm_package_version ?? "0.1.0",
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    usersTotal: stats.usersTotal,
    administratorsTotal: stats.administratorsTotal,
    registrationsToday: stats.registrationsToday,
    registrationsTotal: stats.usersTotal,
    checkedAt: new Date().toISOString(),
  };
}

export async function adjustCreditsByAdmin(input: {
  actor: AuthenticatedUser;
  targetUserId: number;
  amount: number;
  reason: string;
  operation: "add" | "remove";
  ipAddress?: string | null;
}) {
  assertAdmin(input.actor);

  if (
    !Number.isInteger(input.targetUserId) ||
    input.targetUserId <= 0 ||
    !Number.isInteger(input.amount) ||
    input.amount <= 0 ||
    input.amount > 1_000_000 ||
    input.reason.trim().length < 3 ||
    input.reason.trim().length > 500
  ) {
    throw new Error("INVALID_ADMIN_CREDIT_ADJUSTMENT");
  }

  const target = await getAdminRepository().findUserById(input.targetUserId);
  if (!target) return { status: "not_found" as const };

  const adminId = Number(input.actor.id);
  const reason = input.reason.trim();
  let result;
  try {
    result =
      input.operation === "add"
        ? await adminGrantCredits(
            input.targetUserId,
            input.amount,
            adminId,
            reason
          )
        : await adminRevokeCredits(
            input.targetUserId,
            input.amount,
            adminId,
            reason
          );
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      const credits = await getCreditsOverview(input.targetUserId);
      return {
        status: "insufficient" as const,
        balance: credits.balance,
      };
    }
    throw error;
  }

  await getAuditRepository().create({
    userId: adminId,
    eventType: "admin.action",
    entityType: "credit_account",
    entityId: String(input.targetUserId),
    ipAddress: input.ipAddress ?? null,
    metadata: {
      action: input.operation === "add" ? "credits.add" : "credits.remove",
      targetUserId: input.targetUserId,
      credits: input.amount,
      reason,
      balanceAfter: result.account.balance,
      transactionId: result.transaction.id,
    },
  });

  return {
    status: "completed" as const,
    operation: input.operation,
    targetUserId: input.targetUserId,
    credits: input.amount,
    reason,
    balance: result.account.balance,
    transactionId: result.transaction.id,
    performedBy: adminId,
    createdAt: result.transaction.createdAt,
  };
}
