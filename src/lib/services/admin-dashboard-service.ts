import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabaseHealth } from "@/lib/database/client";
import {
  getAdminRepository,
  getPricingRepository,
  getPromotionsRepository,
} from "@/lib/repositories";
import { getAdminSystemStatus } from "@/lib/services/admin-service";
import { getCommunicationInboxSummary } from "@/lib/services/communications-service";
import { getFinanceOverview } from "@/lib/services/finance-service";

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

export async function getAdminDashboardOverview(actor: AuthenticatedUser) {
  assertAdmin(actor);

  const [system, userStats, inbox, pricing, promotions, database, finance] =
    await Promise.all([
      getAdminSystemStatus(actor),
      getAdminRepository().getUserOverviewStats(),
      getCommunicationInboxSummary(actor).catch(() => ({
        total: 0,
        newCount: 0,
        byChannel: {
          contact: { total: 0, newCount: 0 },
          partner: { total: 0, newCount: 0 },
          press: { total: 0, newCount: 0 },
        },
      })),
      getPricingRepository().listAnalyses(false),
      getPromotionsRepository().listPromotions(),
      getDatabaseHealth(),
      getFinanceOverview(actor).catch(() => ({
        incomeEur: 0,
        expenseEur: 0,
        balanceEur: 0,
        incomeLabel: "0,00 €",
        expenseLabel: "0,00 €",
        balanceLabel: "0,00 €",
        paymentsCount: 0,
        apiCallsToday: 0,
        apiCallsTotal: 0,
        dailySeries: [],
        expenseByProvider: [],
        incomeByProvider: [],
      })),
    ]);

  const activeAnalyses = pricing.filter((item) => item.isActive).length;
  const activePromotions = promotions.filter((item) => item.isActive).length;
  const failedLogins = 0;

  return {
    system,
    userStats,
    inbox,
    activeAnalyses,
    activePromotions,
    openTickets: inbox.newCount,
    failedLogins,
    storageUsedMb: system.memoryMb,
    apiStatus: database.reachable ? "operational" : "degraded",
    finance: {
      incomeLabel: finance.incomeLabel,
      expenseLabel: finance.expenseLabel,
      balanceLabel: finance.balanceLabel,
      apiCallsToday: finance.apiCallsToday,
    },
    sections: {
      benutzer: {
        label: "Benutzer",
        href: "/admin/benutzer/uebersicht",
        metrics: [
          {
            label: "Neue Registrierungen heute",
            value: userStats.registrationsToday,
          },
          { label: "Aktive Benutzer", value: userStats.activeUsers },
          { label: "Verifiziert", value: userStats.verifiedUsers },
        ],
      },
      marketing: {
        label: "Marketing",
        href: "/admin/marketing/preise",
        metrics: [
          { label: "Aktive Promotionen", value: activePromotions },
          { label: "Analyseprodukte aktiv", value: activeAnalyses },
          {
            label: "Ø SynCredits",
            value: userStats.averageSynCredits,
          },
        ],
      },
      website: {
        label: "Website",
        href: "/admin/website/systemstatus",
        metrics: [
          {
            label: "Systemstatus",
            value: system.systemStatus === "operational" ? 1 : 0,
            display:
              system.systemStatus === "operational" ? "Online" : "Degraded",
          },
          { label: "RAM (MB)", value: system.memoryMb },
          {
            label: "DB",
            value: database.reachable ? 1 : 0,
            display: database.reachable ? "Online" : "Offline",
          },
        ],
      },
      finanzen: {
        label: "Finanzen",
        href: "/admin/finanzen/uebersicht",
        metrics: [
          {
            label: "Einnahmen",
            value: Math.round(finance.incomeEur * 100),
            display: finance.incomeLabel,
          },
          {
            label: "API-Ausgaben",
            value: Math.round(finance.expenseEur * 100),
            display: finance.expenseLabel,
          },
          {
            label: "API Calls heute",
            value: finance.apiCallsToday,
          },
        ],
      },
      support: {
        label: "Support",
        href: "/admin/support/nachrichten",
        metrics: [
          { label: "Offene Nachrichten", value: inbox.newCount },
          { label: "Gesamt Inbox", value: inbox.total },
          {
            label: "Kontakt",
            value: inbox.byChannel?.contact?.newCount ?? 0,
          },
        ],
      },
    },
  };
}
