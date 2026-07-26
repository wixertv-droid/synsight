import {
  formatEuroFromCents,
  isReplacedAnalysisKey,
  totalCredits,
} from "@/lib/credits/pricing";
import { getCreditsRepository, getPricingRepository } from "@/lib/repositories";
import { ensureDigitalLeakCatalog } from "@/lib/credits/ensure-digital-leak-catalog";

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");
}

function checkoutMode(): "instant" | "provider" {
  const mode = process.env.CREDITS_CHECKOUT_MODE?.trim().toLowerCase();
  if (mode === "instant") {
    // Instant checkout is DEV/test only — never default in production.
    if (process.env.NODE_ENV === "production") {
      return "provider";
    }
    return "instant";
  }
  if (mode === "provider") return "provider";
  // Production defaults to provider; development may use instant for local tests.
  return process.env.NODE_ENV === "production" ? "provider" : "instant";
}

function defaultProvider(): string {
  return process.env.CREDITS_PAYMENT_PROVIDER?.trim() || "manual";
}

export async function getCreditsOverview(userId: number) {
  const repo = getCreditsRepository();
  const account = await repo.ensureAccount(userId);
  const spentThisMonth = await repo.sumSpentSince(userId, startOfMonthIso());
  const recent = await repo.listTransactions(userId, 8);

  return {
    balance: account.balance,
    lifetimePurchased: account.lifetimePurchased,
    lifetimeSpent: account.lifetimeSpent,
    lifetimeBonus: account.lifetimeBonus,
    spentThisMonth,
    recentTransactions: recent.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      analysisKey: tx.analysisKey,
      packageCode: tx.packageCode,
      createdAt: tx.createdAt,
    })),
  };
}

export async function getCreditsHistory(userId: number, limit = 50) {
  const repo = getCreditsRepository();
  await repo.ensureAccount(userId);
  return repo.listTransactions(userId, limit);
}

export async function listCreditPackages() {
  const repo = getCreditsRepository();
  const packages = await repo.listPackages();
  return packages.map((pack) => ({
    ...pack,
    totalCredits: pack.credits + pack.bonusCredits,
    priceLabel: formatEuroFromCents(pack.priceCents),
  }));
}

export async function purchaseCreditPackage(
  userId: number,
  packageCode: string
) {
  const repo = getCreditsRepository();
  const pack = await repo.findPackageByCode(packageCode);
  if (!pack || !pack.isActive) {
    return { status: "not_found" as const };
  }

  const provider = defaultProvider();
  const mode = checkoutMode();
  const creditsTotal = totalCredits({
    code: pack.code,
    name: pack.name,
    credits: pack.credits,
    bonusCredits: pack.bonusCredits,
    priceCents: pack.priceCents,
    currency: pack.currency,
    badge: pack.badge,
    sortOrder: pack.sortOrder,
  });

  // H-05: Instant checkout is DEV-only. Production must use a real provider later.
  if (mode === "provider") {
    const payment = await repo.createPayment({
      userId,
      packageId: pack.id,
      amountCents: pack.priceCents,
      currency: pack.currency,
      provider,
      status: "pending",
      providerReference: null,
    });
    return {
      status: "checkout_pending" as const,
      paymentId: payment.id,
      provider,
      packageCode: pack.code,
      credits: creditsTotal,
      amountCents: pack.priceCents,
      message:
        "Zahlungsanbieter ist für den Produktivbetrieb erforderlich. Instant-Checkout ist nur in der Entwicklungsumgebung verfügbar (CREDITS_CHECKOUT_MODE=instant, NODE_ENV≠production).",
    };
  }

  const payment = await repo.createPayment({
    userId,
    packageId: pack.id,
    amountCents: pack.priceCents,
    currency: pack.currency,
    provider: "manual",
    status: "completed",
    providerReference: `instant-${Date.now()}`,
    paidAt: new Date().toISOString().slice(0, 23).replace("T", " "),
  });

  await repo.createInvoice({
    userId,
    paymentId: payment.id,
    amountCents: pack.priceCents,
    currency: pack.currency,
  });

  const purchased = await repo.applyCreditChange({
    userId,
    type: "purchase",
    amount: pack.credits,
    description: `SynCredits Paket ${pack.name}`,
    packageCode: pack.code,
    paymentId: payment.id,
    transactionSource: "purchase",
  });

  let balance = purchased.account.balance;
  if (pack.bonusCredits > 0) {
    const bonus = await repo.applyCreditChange({
      userId,
      type: "bonus",
      amount: pack.bonusCredits,
      description: `Bonus für Paket ${pack.name}`,
      packageCode: pack.code,
      paymentId: payment.id,
      transactionSource: "bonus",
    });
    balance = bonus.account.balance;
  }

  return {
    status: "completed" as const,
    paymentId: payment.id,
    provider: "manual",
    packageCode: pack.code,
    credits: creditsTotal,
    amountCents: pack.priceCents,
    balance,
  };
}

export async function consumeCredits(
  userId: number,
  analysisKey: string,
  requestId?: string
) {
  await ensureDigitalLeakCatalog(false);
  if (isReplacedAnalysisKey(analysisKey)) {
    return { status: "unknown_analysis" as const };
  }
  const price = await getPricingRepository().findAnalysisByKey(analysisKey);
  if (!price || !price.isActive) {
    return { status: "unknown_analysis" as const };
  }

  const repo = getCreditsRepository();
  const result = await repo.consumeAnalysisCreditsAtomic({
    userId,
    analysisKey: price.analysisKey,
    credits: price.credits,
    label: price.label,
    requestId: requestId?.trim() || null,
  });

  if (result.status === "insufficient") {
    return {
      status: "insufficient" as const,
      required: price.credits,
      balance: result.balance,
      analysisKey: price.analysisKey,
      label: price.label,
    };
  }

  return {
    status: "completed" as const,
    analysisKey: price.analysisKey,
    label: price.label,
    creditsCharged: result.creditsCharged,
    balance: result.balance,
    transactionId: result.transactionId,
    usageLogId: result.usageLogId,
    alreadyConsumed: result.alreadyConsumed,
  };
}

/** Refund SynCredits for a failed/aborted analysis (idempotent by requestId). */
export async function refundAnalysisCredits(
  userId: number,
  requestId: string,
  reason = "analysis_failed"
) {
  const trimmed = requestId.trim();
  if (!trimmed) {
    return { status: "not_found" as const };
  }
  const repo = getCreditsRepository();
  return repo.refundAnalysisCreditsAtomic({
    userId,
    requestId: trimmed,
    reason,
  });
}
