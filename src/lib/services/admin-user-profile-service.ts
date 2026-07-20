import type { AuthenticatedUser } from "@/lib/auth/types";
import { getIntelligenceReport } from "@/lib/analysis/session-store";
import {
  getAdminRepository,
  getPromotionsRepository,
} from "@/lib/repositories";
import {
  getCreditsHistory,
  getCreditsOverview,
} from "@/lib/services/credits-service";
import { getIdentityForUser } from "@/lib/services/identity-service";

import { canAccessAdminArea } from "@/lib/admin/permissions";

function assertStaff(actor: AuthenticatedUser): void {
  if (!canAccessAdminArea(actor.role)) throw new Error("STAFF_FORBIDDEN");
}

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

export async function getAdminUserFullProfile(
  actor: AuthenticatedUser,
  userId: number
) {
  assertStaff(actor);

  const user = await getAdminRepository().findUserById(userId);
  if (!user) return null;

  const [identity, credits, transactions, sessions, auditEvents, googleReport] =
    await Promise.all([
      getIdentityForUser(userId),
      getCreditsOverview(userId),
      getCreditsHistory(userId, 50),
      getAdminRepository().listUserSessions(userId, 30),
      getAdminRepository().listAuditEvents({ userId, limit: 50 }),
      Promise.resolve(getIntelligenceReport(userId, "google_search")),
    ]);

  let promotionRewards: Array<{
    promotionId: number;
    credits: number;
    createdAt: string;
  }> = [];
  try {
    const promoRepo = getPromotionsRepository();
    if ("listRewardsForUser" in promoRepo) {
      promotionRewards = await (
        promoRepo as {
          listRewardsForUser: (
            id: number
          ) => Promise<
            Array<{ promotionId: number; credits: number; createdAt: string }>
          >;
        }
      ).listRewardsForUser(userId);
    }
  } catch {
    promotionRewards = [];
  }

  return {
    user,
    identity,
    credits,
    transactions,
    sessions,
    auditEvents,
    analyses: {
      google_search: googleReport,
    },
    promotions: promotionRewards,
    timeline: buildTimeline(auditEvents, transactions, sessions),
  };
}

function buildTimeline(
  auditEvents: Array<{ id: number; eventType: string; createdAt: string }>,
  transactions: Array<{ id: number; description: string; createdAt: string }>,
  sessions: Array<{ id: string; createdAt: string; ipAddress: string | null }>
) {
  return [
    ...auditEvents.map((event) => ({
      id: `audit-${event.id}`,
      at: event.createdAt,
      label: event.eventType,
      kind: "audit" as const,
    })),
    ...transactions.map((tx) => ({
      id: `tx-${tx.id}`,
      at: tx.createdAt,
      label: tx.description,
      kind: "credits" as const,
    })),
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      at: session.createdAt,
      label: `Login ${session.ipAddress ?? "—"}`,
      kind: "login" as const,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 80);
}

export async function getAdminUserOverview(actor: AuthenticatedUser) {
  assertAdmin(actor);
  return getAdminRepository().getUserOverviewStats();
}

export async function listAdminUsers(
  actor: AuthenticatedUser,
  params: Parameters<ReturnType<typeof getAdminRepository>["listUsers"]>[0]
) {
  assertStaff(actor);
  return getAdminRepository().listUsers(params);
}

export async function listAdminAuditEvents(
  actor: AuthenticatedUser,
  params: { userId?: number; limit?: number }
) {
  assertStaff(actor);
  return getAdminRepository().listAuditEvents(params);
}

export async function listAdminUserSessions(
  actor: AuthenticatedUser,
  userId: number,
  limit?: number
) {
  assertStaff(actor);
  return getAdminRepository().listUserSessions(userId, limit);
}
