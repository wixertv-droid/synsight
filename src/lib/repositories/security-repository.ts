import type { SecurityProfile } from "@/types/domain";

export interface SecurityStatusSummary {
  monitoringEnabled: boolean;
  securityScore: number | null;
  lastAnalysisAt: string | null;
  nextScanAt: string | null;
  openSignals: number;
  criticalAlerts: boolean;
  statusLabel: string;
}

export interface SecurityRepository {
  findByUserId(userId: number): Promise<SecurityProfile | null>;
  getStatusSummary(userId: number): Promise<SecurityStatusSummary>;
}

export function createInMemorySecurityRepository(): SecurityRepository {
  return {
    async findByUserId(userId: number) {
      if (userId !== 1) return null;

      return {
        id: 1,
        userId: 1,
        monitoringEnabled: true,
        criticalAlerts: true,
        weeklySummary: true,
        aiRecommendations: true,
        securityScore: 78,
        lastAnalysisAt: new Date().toISOString(),
        nextScanAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        consentMonitoringAt: new Date().toISOString(),
      };
    },

    async getStatusSummary(userId: number) {
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
