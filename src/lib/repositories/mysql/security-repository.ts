import { eq } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { securityProfiles } from "@/lib/database/schema";
import type { SecurityProfile } from "@/types/domain";
import {
  createInMemorySecurityRepository,
  type SecurityRepository,
  type SecurityStatusSummary,
} from "../security-repository";

function mapSecurityProfile(row: typeof securityProfiles.$inferSelect): SecurityProfile {
  return {
    id: row.id,
    userId: row.userId,
    monitoringEnabled: row.monitoringEnabled,
    criticalAlerts: row.criticalAlerts,
    weeklySummary: row.weeklySummary,
    aiRecommendations: row.aiRecommendations,
    securityScore: row.securityScore,
    lastAnalysisAt: row.lastAnalysisAt,
    nextScanAt: row.nextScanAt,
    consentMonitoringAt: row.consentMonitoringAt,
  };
}

export function createMysqlSecurityRepository(db: SynSightDatabase): SecurityRepository {
  return {
    async findByUserId(userId) {
      const rows = await db
        .select()
        .from(securityProfiles)
        .where(eq(securityProfiles.userId, userId))
        .limit(1);

      return rows[0] ? mapSecurityProfile(rows[0]) : null;
    },

    async getStatusSummary(userId): Promise<SecurityStatusSummary> {
      const profile = await this.findByUserId(userId);
      if (!profile) {
        return {
          monitoringEnabled: false,
          securityScore: null,
          lastAnalysisAt: null,
          nextScanAt: null,
          openSignals: 0,
          criticalAlerts: false,
          statusLabel: "Nicht konfiguriert",
        };
      }

      return {
        monitoringEnabled: profile.monitoringEnabled,
        securityScore: profile.securityScore,
        lastAnalysisAt: profile.lastAnalysisAt,
        nextScanAt: profile.nextScanAt,
        openSignals: 3,
        criticalAlerts: profile.criticalAlerts,
        statusLabel: profile.monitoringEnabled ? "System online" : "Monitoring pausiert",
      };
    },
  };
}

export function createSecurityRepository(db: SynSightDatabase | null): SecurityRepository {
  if (db) {
    return createMysqlSecurityRepository(db);
  }
  return createInMemorySecurityRepository();
}
