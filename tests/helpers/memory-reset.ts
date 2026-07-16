/**
 * Clears in-memory repository state between tests.
 * Safe when DATABASE_URL is unset and repositories use globalThis stores.
 */
export function resetInMemoryStores(): void {
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
    __synsightCreditPayments?: unknown[];
    __synsightCreditPaymentId?: number;
    __synsightUsageLogs?: unknown[];
    __synsightUsageLogId?: number;
    __synsightInvoiceId?: number;
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
  delete g.__synsightCreditPayments;
  delete g.__synsightCreditPaymentId;
  delete g.__synsightUsageLogs;
  delete g.__synsightUsageLogId;
  delete g.__synsightInvoiceId;
}
