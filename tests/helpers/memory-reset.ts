/**
 * Clears in-memory repository state between tests.
 * Safe when DATABASE_URL is unset and repositories use globalThis stores.
 */
import { resetDigitalLeakCatalogEnsureForTests } from "@/lib/credits/ensure-digital-leak-catalog";

export function resetInMemoryStores(): void {
  resetDigitalLeakCatalogEnsureForTests();

  const g = globalThis as typeof globalThis & {
    __synsightUsers?: Map<unknown, unknown>;
    __synsightNextUserId?: number;
    __synsightSessions?: Map<unknown, unknown>;
    __synsightUserTokens?: Map<unknown, unknown>;
    __synsightNextTokenId?: number;
    __synsightAuditEvents?: unknown[];
    __synsightRateLimits?: Map<unknown, unknown>;
    __synsightProfiles?: Map<unknown, unknown>;
    __synsightOnboarding?: Map<unknown, unknown>;
    __synsightSecurityProfiles?: Map<unknown, unknown>;
    __synsightIdentity?: Map<unknown, unknown>;
    __synsightCreditAccounts?: Map<unknown, unknown>;
    __synsightCreditTx?: unknown[];
    __synsightCreditTxId?: number;
    __synsightCreditPackages?: unknown[];
    __synsightAnalysisPricing?: unknown[];
    __synsightCreditPayments?: unknown[];
    __synsightCreditPaymentId?: number;
    __synsightUsageLogs?: unknown[];
    __synsightUsageLogId?: number;
    __synsightInvoiceId?: number;
    __synsightPromotions?: unknown[];
    __synsightPromotionId?: number;
    __synsightPromotionRewards?: unknown[];
    __synsightPromotionRewardId?: number;
    __synsightPromotionLogs?: unknown[];
    __synsightPromotionLogId?: number;
    __synsightCommunicationSettings?: unknown;
    __synsightContactRequests?: unknown[];
    __synsightContactRequestId?: number;
    __synsightPartnerRequests?: unknown[];
    __synsightPartnerRequestId?: number;
    __synsightPressRequests?: unknown[];
    __synsightPressRequestId?: number;
  };

  g.__synsightUsers?.clear();
  delete g.__synsightUsers;
  delete g.__synsightNextUserId;
  g.__synsightSessions?.clear();
  delete g.__synsightSessions;
  g.__synsightUserTokens?.clear();
  delete g.__synsightUserTokens;
  delete g.__synsightNextTokenId;
  delete g.__synsightAuditEvents;
  g.__synsightRateLimits?.clear();
  g.__synsightProfiles?.clear();
  delete g.__synsightProfiles;
  g.__synsightOnboarding?.clear();
  delete g.__synsightOnboarding;
  g.__synsightSecurityProfiles?.clear();
  delete g.__synsightSecurityProfiles;
  g.__synsightIdentity?.clear();
  delete g.__synsightIdentity;
  g.__synsightCreditAccounts?.clear();
  delete g.__synsightCreditAccounts;
  delete g.__synsightCreditTx;
  delete g.__synsightCreditTxId;
  delete g.__synsightCreditPackages;
  delete g.__synsightAnalysisPricing;
  delete g.__synsightCreditPayments;
  delete g.__synsightCreditPaymentId;
  delete g.__synsightUsageLogs;
  delete g.__synsightUsageLogId;
  delete g.__synsightInvoiceId;
  delete g.__synsightPromotions;
  delete g.__synsightPromotionId;
  delete g.__synsightPromotionRewards;
  delete g.__synsightPromotionRewardId;
  delete g.__synsightPromotionLogs;
  delete g.__synsightPromotionLogId;
  delete g.__synsightCommunicationSettings;
  delete g.__synsightContactRequests;
  delete g.__synsightContactRequestId;
  delete g.__synsightPartnerRequests;
  delete g.__synsightPartnerRequestId;
  delete g.__synsightPressRequests;
  delete g.__synsightPressRequestId;
}
