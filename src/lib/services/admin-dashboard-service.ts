import type { AuthenticatedUser } from "@/lib/auth/types";
import { getDatabaseHealth } from "@/lib/database/client";
import {
  getAdminRepository,
  getPricingRepository,
  getPromotionsRepository,
} from "@/lib/repositories";
import { getAdminSystemStatus } from "@/lib/services/admin-service";
import { getCommunicationInboxSummary } from "@/lib/services/communications-service";

function assertAdmin(actor: AuthenticatedUser): void {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
}

export async function getAdminDashboardOverview(actor: AuthenticatedUser) {
  assertAdmin(actor);

  const [system, userStats, inbox, pricing, promotions, database] =
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
          {
            label: "DB",
            value: database.reachable ? 1 : 0,
            display: database.reachable ? "OK" : "ERR",
          },
          { label: "RAM (MB)", value: system.memoryMb },
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
