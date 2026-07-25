/**
 * Central analysis gate (Sprint RC-2).
 * Every analysis run MUST pass through assertAnalysisRunnable before
 * SerpAPI / Gemini / DeHashed / persistence.
 */
import { getPricingRepository, getCreditsRepository } from "@/lib/repositories";
import { consumeCredits } from "@/lib/services/credits-service";
import { isGoogleSearchConfigured } from "@/lib/analysis/google/custom-search";
import { isDehashedConfiguredAndActive } from "@/lib/analysis/digital-exposure/dehashed-client";
import { getUsernameModuleSettings } from "@/lib/analysis/username/settings";
import { isReplacedAnalysisKey } from "@/lib/credits/pricing";

export type AnalysisGateCode =
  | "NOT_AUTHENTICATED"
  | "MODULE_INACTIVE"
  | "MODULE_REPLACED"
  | "NO_PRICE"
  | "API_UNAVAILABLE"
  | "INSUFFICIENT_CREDITS"
  | "UNKNOWN_ANALYSIS"
  | "REQUEST_ID_REQUIRED"
  | "FORBIDDEN";

export class AnalysisGateError extends Error {
  readonly code: AnalysisGateCode;
  readonly httpStatus: number;

  constructor(code: AnalysisGateCode, message: string, httpStatus: number) {
    super(message);
    this.name = "AnalysisGateError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface AssertAnalysisRunnableInput {
  userId: number;
  analysisKey: string;
  /** Idempotency key from client consume — required for runs */
  requestId: string;
  /** When false, only validate (no consume). Default true. */
  consume?: boolean;
}

export interface AssertAnalysisRunnableResult {
  analysisKey: string;
  label: string;
  creditsCharged: number;
  balance: number;
  transactionId: number | null;
  usageLogId: number | null;
  alreadyConsumed: boolean;
  apiConfigured: boolean;
}

async function assertProviderReady(analysisKey: string): Promise<boolean> {
  if (analysisKey === "google_search") {
    return isGoogleSearchConfigured();
  }
  if (analysisKey === "digital_leak_exposure") {
    return isDehashedConfiguredAndActive();
  }
  if (analysisKey === "username_intelligence") {
    const settings = await getUsernameModuleSettings();
    if (!settings.isActive || !settings.apiEnabled) return false;
    return isGoogleSearchConfigured();
  }
  return false;
}

/**
 * Validate module can run and ensure SynCredits are consumed (idempotent).
 */
export async function assertAnalysisRunnable(
  input: AssertAnalysisRunnableInput
): Promise<AssertAnalysisRunnableResult> {
  const analysisKey = input.analysisKey.trim();
  const requestId = input.requestId?.trim();

  if (!Number.isFinite(input.userId) || input.userId <= 0) {
    throw new AnalysisGateError(
      "NOT_AUTHENTICATED",
      "Sie müssen angemeldet sein.",
      401
    );
  }

  if (!requestId || requestId.length < 8) {
    throw new AnalysisGateError(
      "REQUEST_ID_REQUIRED",
      "Ungültige Anfragekennung. Bitte Analyse erneut über das Analyse Center starten.",
      400
    );
  }

  if (isReplacedAnalysisKey(analysisKey)) {
    throw new AnalysisGateError(
      "MODULE_REPLACED",
      "Dieses Analysemodul ist nicht mehr verfügbar.",
      403
    );
  }

  const price = await getPricingRepository().findAnalysisByKey(analysisKey);
  if (!price) {
    throw new AnalysisGateError(
      "NO_PRICE",
      "Für dieses Modul ist kein Preis hinterlegt.",
      404
    );
  }
  if (!price.isActive) {
    throw new AnalysisGateError(
      "MODULE_INACTIVE",
      "Dieses Analysemodul ist deaktiviert.",
      403
    );
  }

  if (analysisKey === "username_intelligence") {
    const settings = await getUsernameModuleSettings();
    if (!settings.isActive || !settings.apiEnabled) {
      throw new AnalysisGateError(
        "MODULE_INACTIVE",
        "Username Intelligence Scan ist deaktiviert.",
        403
      );
    }
  }

  const apiConfigured = await assertProviderReady(analysisKey);
  if (!apiConfigured) {
    throw new AnalysisGateError(
      "API_UNAVAILABLE",
      "Die benötigte API ist nicht konfiguriert oder deaktiviert.",
      503
    );
  }

  const creditsRepo = getCreditsRepository();
  const existing = await creditsRepo.findUsageByRequestId(
    input.userId,
    requestId
  );

  if (existing) {
    if (
      existing.analysisKey !== analysisKey ||
      existing.userId !== input.userId
    ) {
      throw new AnalysisGateError(
        "FORBIDDEN",
        "Anfragekennung gehört zu einer anderen Analyse.",
        403
      );
    }
    if (existing.status !== "completed") {
      throw new AnalysisGateError(
        "INSUFFICIENT_CREDITS",
        "SynCredits-Abbuchung war nicht erfolgreich.",
        402
      );
    }
    const account = await creditsRepo.ensureAccount(input.userId);
    return {
      analysisKey,
      label: price.label,
      creditsCharged: existing.creditsCharged,
      balance: account.balance,
      transactionId: existing.transactionId,
      usageLogId: existing.id,
      alreadyConsumed: true,
      apiConfigured,
    };
  }

  if (input.consume === false) {
    const account = await creditsRepo.ensureAccount(input.userId);
    if (account.balance < price.credits) {
      throw new AnalysisGateError(
        "INSUFFICIENT_CREDITS",
        `Nicht genügend SynCredits. Benötigt: ${price.credits}.`,
        402
      );
    }
    return {
      analysisKey,
      label: price.label,
      creditsCharged: 0,
      balance: account.balance,
      transactionId: null,
      usageLogId: null,
      alreadyConsumed: false,
      apiConfigured,
    };
  }

  const consumed = await consumeCredits(input.userId, analysisKey, requestId);
  if (consumed.status === "unknown_analysis") {
    throw new AnalysisGateError(
      "UNKNOWN_ANALYSIS",
      "Unbekanntes Analysemodul.",
      404
    );
  }
  if (consumed.status === "insufficient") {
    throw new AnalysisGateError(
      "INSUFFICIENT_CREDITS",
      `Nicht genügend SynCredits. Benötigt: ${consumed.required}, verfügbar: ${consumed.balance}.`,
      402
    );
  }

  return {
    analysisKey,
    label: consumed.label,
    creditsCharged: consumed.creditsCharged,
    balance: consumed.balance,
    transactionId: consumed.transactionId,
    usageLogId: consumed.usageLogId,
    alreadyConsumed: Boolean(consumed.alreadyConsumed),
    apiConfigured,
  };
}

/** Map gate errors to API responses. */
export function analysisGateHttpStatus(error: unknown): number {
  if (error instanceof AnalysisGateError) return error.httpStatus;
  return 500;
}
