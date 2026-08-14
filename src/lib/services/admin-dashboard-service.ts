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
  if (actor.role !== "admin") {
    throw new Error("ADMIN_FORBIDDEN");
  }
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
          support: { total: 0, newCount: 0 },
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

  return {
    system: {
      systemStatus: system.systemStatus,
      memoryMb: system.memoryMb,
      databaseStatus: database.reachable ? "operational" : "degraded",
    },

    userStats,

    inbox,

    activeAnalyses,
    activePromotions,

    openTickets: inbox.newCount,

    finance: {
      incomeEur: finance.incomeEur,
      expenseEur: finance.expenseEur,
      balanceEur: finance.balanceEur,

      incomeLabel: finance.incomeLabel,
      expenseLabel: finance.expenseLabel,
      balanceLabel: finance.balanceLabel,

      apiCallsToday: finance.apiCallsToday,
      apiCallsTotal: finance.apiCallsTotal,
      paymentsCount: finance.paymentsCount,

      dailySeries: finance.dailySeries,
      expenseByProvider: finance.expenseByProvider,
      incomeByProvider: finance.incomeByProvider,
    },

    sections: {
      benutzer: {
        label: "Benutzer & Konten",
        href: "/admin/benutzer/uebersicht",
        metrics: [
          {
            label: "Registrierungen heute",
            value: userStats.registrationsToday,
          },
          {
            label: "Aktive Benutzer",
            value: userStats.activeUsers,
          },
          {
            label: "Verifiziert",
            value: userStats.verifiedUsers,
          },
        ],
      },

      analysen: {
        label: "Analysen & Module",
        href: "/admin/analysen/module",
        metrics: [
          {
            label: "Aktive Analyseprodukte",
            value: activeAnalyses,
          },
          {
            label: "Ø SynCredits Benutzer",
            value: userStats.averageSynCredits,
          },
        ],
      },

      website: {
        label: "Website & Inhalte",
        href: "/admin/website/wissen",
        metrics: [
          {
            label: "System",
            value: system.systemStatus === "operational" ? 1 : 0,
            display:
              system.systemStatus === "operational" ? "Online" : "Degraded",
          },
          {
            label: "Datenbank",
            value: database.reachable ? 1 : 0,
            display: database.reachable ? "Online" : "Offline",
          },
        ],
      },

      integrationen: {
        label: "APIs & Integrationen",
        href: "/admin/integrationen/api",
        metrics: [
          {
            label: "API Calls heute",
            value: finance.apiCallsToday,
          },
          {
            label: "API Calls gesamt",
            value: finance.apiCallsTotal,
          },
        ],
      },

      geschaeft: {
        label: "Geschäft & Finanzen",
        href: "/admin/geschaeft/uebersicht",
        metrics: [
          {
            label: "Einnahmen · 14 Tage",
            value: Math.round(finance.incomeEur * 100),
            display: finance.incomeLabel,
          },
          {
            label: "API-Kosten · 14 Tage",
            value: Math.round(finance.expenseEur * 100),
            display: finance.expenseLabel,
          },
          {
            label: "Saldo · 14 Tage",
            value: Math.round(finance.balanceEur * 100),
            display: finance.balanceLabel,
          },
        ],
      },

      support: {
        label: "Support & Kommunikation",
        href: "/admin/support/nachrichten",
        metrics: [
          {
            label: "Neue Nachrichten",
            value: inbox.newCount,
          },
          {
            label: "Gesamt Inbox",
            value: inbox.total,
          },
          {
            label: "Support neu",
            value: inbox.byChannel?.support?.newCount ?? 0,
          },
        ],
      },

      system: {
        label: "System & Sicherheit",
        href: "/admin/system/status",
        metrics: [
          {
            label: "Systemstatus",
            value: system.systemStatus === "operational" ? 1 : 0,
            display:
              system.systemStatus === "operational" ? "Online" : "Degraded",
          },
          {
            label: "Datenbank",
            value: database.reachable ? 1 : 0,
            display: database.reachable ? "Online" : "Offline",
          },
          {
            label: "RAM",
            value: system.memoryMb,
            display: `${system.memoryMb} MB`,
          },
        ],
      },
    },
  };
}
