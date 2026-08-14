import type {
  UsernameFinanceSnapshot,
  UsernameModuleSettings,
} from "@/lib/analysis/username/types";
import {
  calculateTokenCostEur,
  getRuntimeApiCostSetting,
  type ApiTokenUsage,
} from "@/lib/services/finance-service";

/** Typical billable SerpAPI calls per analysis (planner mid-range). */
export const USERNAME_TYPICAL_SERP_REQUESTS = 6;

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export async function resolveUsernameCentralCosts(
  settings: UsernameModuleSettings
): Promise<{
  serpapiCostPerRequestEur: number;
  geminiEstimatedCostEur: number;
}> {
  const [serpapi, gemini] = await Promise.all([
    getRuntimeApiCostSetting("serpapi"),
    getRuntimeApiCostSetting("gemini"),
  ]);

  const serpapiCostPerRequestEur =
    serpapi?.isActive !== false && serpapi
      ? serpapi.costPerRequestEur
      : settings.serpapiCostEur;

  /*
   * Für die Vorschau gibt es noch keine echte Tokenmenge.
   * Deshalb verwenden wir als konservativen Fallback den historischen
   * Username-Gemini-Wert. Die echten Scankosten werden unten immer
   * aus usageMetadata berechnet.
   */
  const geminiEstimatedCostEur = settings.geminiCostEur;

  return {
    serpapiCostPerRequestEur: Math.max(0, serpapiCostPerRequestEur),
    geminiEstimatedCostEur: Math.max(0, geminiEstimatedCostEur),
  };
}

export async function computeUsernameFinance(
  settings: UsernameModuleSettings
): Promise<UsernameFinanceSnapshot> {
  const maxQueries = Math.min(8, Math.max(5, settings.maxQueries));
  const typicalRequests = Math.min(maxQueries, USERNAME_TYPICAL_SERP_REQUESTS);

  const central = await resolveUsernameCentralCosts(settings);

  const estimatedApiCostEur = round6(
    typicalRequests * central.serpapiCostPerRequestEur +
      central.geminiEstimatedCostEur
  );

  const markupFactor = 1 + Math.max(0, settings.markupPercent) / 100;
  const costPerAnalysisEur = round6(estimatedApiCostEur * markupFactor);

  const revenuePerAnalysisEur = round6(
    settings.synCredits * settings.creditValueEur
  );

  const profitPerAnalysisEur = round6(
    revenuePerAnalysisEur - estimatedApiCostEur
  );

  return {
    synCredits: settings.synCredits,
    serpapiCostEur: central.serpapiCostPerRequestEur,
    geminiCostEur: central.geminiEstimatedCostEur,
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

export async function computeActualUsernameApiCosts(input: {
  settings: UsernameModuleSettings;
  serpapiRequests: number;
  geminiTokenUsage?: ApiTokenUsage | null;
}): Promise<{
  serpapiCostEur: number;
  geminiCostEur: number;
  totalApiCostEur: number;
}> {
  const [serpapi, gemini] = await Promise.all([
    getRuntimeApiCostSetting("serpapi"),
    getRuntimeApiCostSetting("gemini"),
  ]);

  const serpUnit =
    serpapi?.isActive !== false && serpapi
      ? serpapi.costPerRequestEur
      : input.settings.serpapiCostEur;

  const serpapiCostEur = round6(
    Math.max(0, input.serpapiRequests) * Math.max(0, serpUnit)
  );

  let geminiCostEur = 0;

  if (input.geminiTokenUsage) {
    if (gemini?.isActive !== false && gemini?.billingMode === "per_token") {
      geminiCostEur = round6(
        calculateTokenCostEur(
          input.geminiTokenUsage,
          gemini.costPer1mInputTokensEur,
          gemini.costPer1mOutputTokensEur
        )
      );
    } else {
      // Sicherheits-Fallback für noch nicht korrekt konfigurierte Systeme.
      geminiCostEur = Math.max(0, input.settings.geminiCostEur);
    }
  }

  return {
    serpapiCostEur,
    geminiCostEur,
    totalApiCostEur: round6(serpapiCostEur + geminiCostEur),
  };
}
