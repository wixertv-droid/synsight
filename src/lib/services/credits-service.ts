import {
  formatEuroFromCents,
  getAnalysisPrice,
  listAnalysisPrices,
  totalCredits,
  type AnalysisKey,
} from "@/lib/credits/pricing";
import { getCreditsRepository } from "@/lib/repositories";

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");
}

function checkoutMode(): "instant" | "provider" {
  const mode = process.env.CREDITS_CHECKOUT_MODE?.trim().toLowerCase();
  if (mode === "provider") return "provider";
  return "instant";
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

export async function getPricingCatalog() {
  return {
    analyses: listAnalysisPrices(),
    packages: await listCreditPackages(),
    checkoutMode: checkoutMode(),
    providersPrepared: [
      "manual",
      "stripe",
      "paypal",
      "apple_pay",
      "google_pay",
      "sepa",
    ],
  };
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

  if (mode === "provider" && provider !== "manual") {
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
        "Zahlungsanbieter ist vorbereitet, aber noch nicht angebunden. Setzen Sie CREDITS_CHECKOUT_MODE=instant für den Testabschluss.",
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
  const price = getAnalysisPrice(analysisKey);
  if (!price) {
    return { status: "unknown_analysis" as const };
  }

  const repo = getCreditsRepository();
  await repo.ensureAccount(userId);

  try {
    const usage = await repo.createUsageLog({
      userId,
      analysisKey: price.key,
      creditsCharged: price.credits,
      status: "completed",
      requestId: requestId ?? null,
    });

    const result = await repo.applyCreditChange({
      userId,
      type: "consume",
      amount: -price.credits,
      description: `${price.label} (${price.credits} SynCredits)`,
      analysisKey: price.key,
      usageLogId: usage.id,
      metadataJson: { requestId: requestId ?? null },
      transactionSource: "analysis",
    });

    return {
      status: "completed" as const,
      analysisKey: price.key as AnalysisKey,
      label: price.label,
      creditsCharged: price.credits,
      balance: result.account.balance,
      transactionId: result.transaction.id,
      usageLogId: usage.id,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      const account = await repo.ensureAccount(userId);
      return {
        status: "insufficient" as const,
        required: price.credits,
        balance: account.balance,
        analysisKey: price.key,
        label: price.label,
      };
    }
    throw error;
  }
}

/** Admin-ready helpers (API later). */
export async function adminGrantCredits(
  userId: number,
  amount: number,
  adminId: number,
  reason: string
) {
  if (amount <= 0) throw new Error("INVALID_AMOUNT");
  const repo = getCreditsRepository();
  return repo.applyCreditChange({
    userId,
    type: "admin_grant",
    amount,
    description: reason || "Admin-Gutschrift",
    createdByAdminId: adminId,
    performedBy: adminId,
    reason,
    transactionSource: "admin_credit",
  });
}

export async function adminRevokeCredits(
  userId: number,
  amount: number,
  adminId: number,
  reason: string
) {
  if (amount <= 0) throw new Error("INVALID_AMOUNT");
  const repo = getCreditsRepository();
  return repo.applyCreditChange({
    userId,
    type: "admin_revoke",
    amount: -amount,
    description: reason || "Admin-Abbuchung",
    createdByAdminId: adminId,
    performedBy: adminId,
    reason,
    transactionSource: "admin_remove",
  });
}
