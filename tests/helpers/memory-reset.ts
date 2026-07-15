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
}
