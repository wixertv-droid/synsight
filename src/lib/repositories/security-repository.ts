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

export interface UpsertSecurityPreferencesInput {
  monitoringEnabled: boolean;
  consentMonitoringAt?: string | null;
}

export interface SecurityRepository {
  findByUserId(userId: number): Promise<SecurityProfile | null>;
  getStatusSummary(userId: number): Promise<SecurityStatusSummary>;
  upsertPreferences(
    userId: number,
    input: UpsertSecurityPreferencesInput
  ): Promise<void>;
}

const memory = globalThis as typeof globalThis & {
  __synsightSecurityProfiles?: Map<number, SecurityProfile>;
};

function getMemoryProfiles(): Map<number, SecurityProfile> {
  if (!memory.__synsightSecurityProfiles) {
    memory.__synsightSecurityProfiles = new Map([
      [
        1,
        {
          id: 1,
          userId: 1,
          monitoringEnabled: true,
          criticalAlerts: true,
          weeklySummary: true,
          aiRecommendations: true,
          securityScore: 78,
          lastAnalysisAt: new Date().toISOString(),
          nextScanAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          consentMonitoringAt: new Date().toISOString(),
        },
      ],
    ]);
  }
  return memory.__synsightSecurityProfiles;
}

export function createInMemorySecurityRepository(): SecurityRepository {
  const profiles = getMemoryProfiles();

  return {
    async findByUserId(userId: number) {
      return profiles.get(userId) ?? null;
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
        statusLabel: profile.monitoringEnabled
          ? "System online"
          : "Monitoring pausiert",
      };
    },

    async upsertPreferences(userId, input) {
      const existing = profiles.get(userId);
      if (existing) {
        existing.monitoringEnabled = input.monitoringEnabled;
        existing.consentMonitoringAt =
          input.consentMonitoringAt ?? existing.consentMonitoringAt;
        return;
      }
      profiles.set(userId, {
        id: profiles.size + 1,
        userId,
        monitoringEnabled: input.monitoringEnabled,
        criticalAlerts: true,
        weeklySummary: true,
        aiRecommendations: true,
        securityScore: null,
        lastAnalysisAt: null,
        nextScanAt: null,
        consentMonitoringAt: input.consentMonitoringAt ?? null,
      });
    },
  };
}
