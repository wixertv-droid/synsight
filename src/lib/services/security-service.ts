/**
 * Security service — monitoring status and security profile access.
 */
import { getSecurityRepository } from "@/lib/repositories";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { SecurityProfile } from "@/types/domain";
import type { SecurityStatusSummary } from "@/lib/repositories/security-repository";

export async function getSecurityProfile(
  user: AuthenticatedUser
): Promise<SecurityProfile | null> {
  const userId = Number(user.id);
  if (!Number.isFinite(userId)) return null;

  const securityRepository = getSecurityRepository();
  return securityRepository.findByUserId(userId);
}

export async function getSecurityStatus(
  user: AuthenticatedUser
): Promise<SecurityStatusSummary> {
  const userId = Number(user.id);
  if (!Number.isFinite(userId)) {
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

  const securityRepository = getSecurityRepository();
  return securityRepository.getStatusSummary(userId);
}
