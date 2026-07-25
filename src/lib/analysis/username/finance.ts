import type {
  UsernameFinanceSnapshot,
  UsernameModuleSettings,
} from "@/lib/analysis/username/types";

/** Typical billable SerpAPI calls per analysis (planner mid-range). */
export const USERNAME_TYPICAL_SERP_REQUESTS = 6;

export function computeUsernameFinance(
  settings: UsernameModuleSettings
): UsernameFinanceSnapshot {
  const maxQueries = Math.min(8, Math.max(5, settings.maxQueries));
  const typicalRequests = Math.min(maxQueries, USERNAME_TYPICAL_SERP_REQUESTS);
  const estimatedApiCostEur =
    Math.round(
      (typicalRequests * settings.serpapiCostEur + settings.geminiCostEur) *
        1_000_000
    ) / 1_000_000;

  const markupFactor = 1 + Math.max(0, settings.markupPercent) / 100;
  const costPerAnalysisEur =
    Math.round(estimatedApiCostEur * markupFactor * 1_000_000) / 1_000_000;

  const revenuePerAnalysisEur =
    Math.round(settings.synCredits * settings.creditValueEur * 1_000_000) /
    1_000_000;

  const profitPerAnalysisEur =
    Math.round((revenuePerAnalysisEur - estimatedApiCostEur) * 1_000_000) /
    1_000_000;

  return {
    synCredits: settings.synCredits,
    serpapiCostEur: settings.serpapiCostEur,
    geminiCostEur: settings.geminiCostEur,
    markupPercent: settings.markupPercent,
    minProfitEur: settings.minProfitEur,
    creditValueEur: settings.creditValueEur,
    maxQueries,
    estimatedApiCostEur,
    costPerAnalysisEur,
    revenuePerAnalysisEur,
    profitPerAnalysisEur,
    meetsMinProfit: profitPerAnalysisEur >= settings.minProfitEur,
  };
}
