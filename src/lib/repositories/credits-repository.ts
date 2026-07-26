import { DEFAULT_CREDIT_PACKAGES, totalCredits } from "@/lib/credits/pricing";

export type CreditTransactionType =
  | "purchase"
  | "consume"
  | "bonus"
  | "admin_grant"
  | "admin_revoke"
  | "refund"
  | "adjustment";

export type CreditTransactionSource =
  | "purchase"
  | "analysis"
  | "bonus"
  | "refund"
  | "admin_credit"
  | "admin_remove"
  | "adjustment"
  | "promotion";

export interface CreditAccountRecord {
  userId: number;
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lifetimeBonus: number;
}

export interface CreditPackageRecord {
  id: number;
  code: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceCents: number;
  currency: string;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CreditTransactionRecord {
  id: number;
  userId: number;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  analysisKey: string | null;
  packageCode: string | null;
  paymentId: number | null;
  usageLogId: number | null;
  description: string;
  metadataJson: Record<string, unknown> | null;
  createdByAdminId: number | null;
  performedBy: number | null;
  reason: string | null;
  transactionSource: CreditTransactionSource;
  createdAt: string;
}

export interface UsageLogRecord {
  id: number;
  userId: number;
  analysisKey: string;
  creditsCharged: number;
  status: "reserved" | "completed" | "failed" | "refunded";
  transactionId: number | null;
  requestId: string | null;
  createdAt: string;
}

export interface PaymentRecord {
  id: number;
  userId: number;
  purpose: "subscription" | "credits" | "other";
  packageId: number | null;
  amount: string;
  amountCents: number | null;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  provider: string;
  providerReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreditsRepository {
  ensureAccount(userId: number): Promise<CreditAccountRecord>;
  getAccount(userId: number): Promise<CreditAccountRecord | null>;
  listPackages(): Promise<CreditPackageRecord[]>;
  findPackageByCode(code: string): Promise<CreditPackageRecord | null>;
  listTransactions(
    userId: number,
    limit?: number
  ): Promise<CreditTransactionRecord[]>;
  sumSpentSince(userId: number, sinceIso: string): Promise<number>;
  applyCreditChange(input: {
    userId: number;
    type: CreditTransactionType;
    amount: number;
    description: string;
    analysisKey?: string | null;
    packageCode?: string | null;
    paymentId?: number | null;
    usageLogId?: number | null;
    metadataJson?: Record<string, unknown> | null;
    createdByAdminId?: number | null;
    performedBy?: number | null;
    reason?: string | null;
    transactionSource?: CreditTransactionSource;
  }): Promise<{
    account: CreditAccountRecord;
    transaction: CreditTransactionRecord;
  }>;
  createPayment(input: {
    userId: number;
    packageId: number;
    amountCents: number;
    currency: string;
    provider: string;
    status: PaymentRecord["status"];
    providerReference?: string | null;
    paidAt?: string | null;
  }): Promise<PaymentRecord>;
  completePayment(paymentId: number): Promise<PaymentRecord | null>;
  createUsageLog(input: {
    userId: number;
    analysisKey: string;
    creditsCharged: number;
    status: UsageLogRecord["status"];
    transactionId?: number | null;
    requestId?: string | null;
  }): Promise<UsageLogRecord>;
  findUsageByRequestId(
    userId: number,
    requestId: string
  ): Promise<UsageLogRecord | null>;
  /**
   * Atomic debit + usage_log insert (or idempotent return / re-charge after refund).
   * Must never leave a debit without a matching usage row.
   */
  consumeAnalysisCreditsAtomic(input: {
    userId: number;
    analysisKey: string;
    credits: number;
    label: string;
    requestId: string | null;
  }): Promise<{
    status: "completed" | "insufficient";
    alreadyConsumed: boolean;
    creditsCharged: number;
    balance: number;
    transactionId: number;
    usageLogId: number;
  }>;
  /** Refund a completed analysis usage by requestId (idempotent). */
  refundAnalysisCreditsAtomic(input: {
    userId: number;
    requestId: string;
    reason: string;
  }): Promise<{
    status: "refunded" | "not_found" | "already_refunded" | "not_completed";
    balance?: number;
    creditsRefunded?: number;
  }>;
  createInvoice(input: {
    userId: number;
    paymentId: number;
    amountCents: number;
    currency: string;
  }): Promise<{ id: number; invoiceNumber: string }>;
}

const memory = globalThis as typeof globalThis & {
  __synsightCreditAccounts?: Map<number, CreditAccountRecord>;
  __synsightCreditTx?: CreditTransactionRecord[];
  __synsightCreditTxId?: number;
  __synsightCreditPackages?: CreditPackageRecord[];
  __synsightCreditPayments?: PaymentRecord[];
  __synsightCreditPaymentId?: number;
  __synsightUsageLogs?: UsageLogRecord[];
  __synsightUsageLogId?: number;
  __synsightInvoiceId?: number;
};

function packages(): CreditPackageRecord[] {
  if (!memory.__synsightCreditPackages) {
    memory.__synsightCreditPackages = DEFAULT_CREDIT_PACKAGES.map(
      (pack, index) => ({
        id: index + 1,
        code: pack.code,
        name: pack.name,
        credits: pack.credits,
        bonusCredits: pack.bonusCredits,
        priceCents: pack.priceCents,
        currency: pack.currency,
        badge: pack.badge,
        sortOrder: pack.sortOrder,
        isActive: true,
        defaultCredits: pack.credits,
        defaultBonusCredits: pack.bonusCredits,
        defaultPriceCents: pack.priceCents,
        isPopular: pack.code === "pack_3600",
        updatedByAdminId: null,
      })
    );
  }
  return memory.__synsightCreditPackages;
}

function accounts(): Map<number, CreditAccountRecord> {
  if (!memory.__synsightCreditAccounts) {
    memory.__synsightCreditAccounts = new Map([
      [
        1,
        {
          userId: 1,
          balance: 0,
          lifetimePurchased: 0,
          lifetimeSpent: 0,
          lifetimeBonus: 0,
        },
      ],
    ]);
  }
  return memory.__synsightCreditAccounts;
}

export function createInMemoryCreditsRepository(): CreditsRepository {
  return {
    async ensureAccount(userId) {
      const map = accounts();
      const existing = map.get(userId);
      if (existing) return existing;
      const created: CreditAccountRecord = {
        userId,
        balance: 0,
        lifetimePurchased: 0,
        lifetimeSpent: 0,
        lifetimeBonus: 0,
      };
      map.set(userId, created);
      return created;
    },

    async getAccount(userId) {
      return accounts().get(userId) ?? null;
    },

    async listPackages() {
      return packages()
        .filter((pack) => pack.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },

    async findPackageByCode(code) {
      return packages().find((pack) => pack.code === code) ?? null;
    },

    async listTransactions(userId, limit = 20) {
      const rows = memory.__synsightCreditTx ?? [];
      return rows
        .filter((row) => row.userId === userId)
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
    },

    async sumSpentSince(userId, sinceIso) {
      const rows = memory.__synsightCreditTx ?? [];
      return rows
        .filter(
          (row) =>
            row.userId === userId &&
            row.type === "consume" &&
            row.createdAt >= sinceIso
        )
        .reduce((sum, row) => sum + Math.abs(row.amount), 0);
    },

    async applyCreditChange(input) {
      const account = await this.ensureAccount(input.userId);
      const nextBalance = account.balance + input.amount;
      if (nextBalance < 0) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      account.balance = nextBalance;
      if (input.amount > 0) {
        if (input.type === "purchase") {
          account.lifetimePurchased += input.amount;
        }
        if (input.type === "bonus" || input.type === "admin_grant") {
          account.lifetimeBonus += input.amount;
        }
      } else {
        account.lifetimeSpent += Math.abs(input.amount);
      }

      const id = memory.__synsightCreditTxId ?? 1;
      memory.__synsightCreditTxId = id + 1;
      const transaction: CreditTransactionRecord = {
        id,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        balanceAfter: nextBalance,
        analysisKey: input.analysisKey ?? null,
        packageCode: input.packageCode ?? null,
        paymentId: input.paymentId ?? null,
        usageLogId: input.usageLogId ?? null,
        description: input.description,
        metadataJson: input.metadataJson ?? null,
        createdByAdminId: input.createdByAdminId ?? null,
        performedBy: input.performedBy ?? input.createdByAdminId ?? null,
        reason: input.reason ?? input.description,
        transactionSource: input.transactionSource ?? "adjustment",
        createdAt: new Date().toISOString(),
      };
      memory.__synsightCreditTx = [
        ...(memory.__synsightCreditTx ?? []),
        transaction,
      ];
      return { account: { ...account }, transaction };
    },

    async createPayment(input) {
      const id = memory.__synsightCreditPaymentId ?? 1;
      memory.__synsightCreditPaymentId = id + 1;
      const payment: PaymentRecord = {
        id,
        userId: input.userId,
        purpose: "credits",
        packageId: input.packageId,
        amount: (input.amountCents / 100).toFixed(2),
        amountCents: input.amountCents,
        currency: input.currency,
        status: input.status,
        provider: input.provider,
        providerReference: input.providerReference ?? null,
        paidAt: input.paidAt ?? null,
        createdAt: new Date().toISOString(),
      };
      memory.__synsightCreditPayments = [
        ...(memory.__synsightCreditPayments ?? []),
        payment,
      ];
      return payment;
    },

    async completePayment(paymentId) {
      const payment = (memory.__synsightCreditPayments ?? []).find(
        (row) => row.id === paymentId
      );
      if (!payment) return null;
      payment.status = "completed";
      payment.paidAt = new Date().toISOString();
      return payment;
    },

    async createUsageLog(input) {
      if (input.requestId) {
        const existing = (memory.__synsightUsageLogs ?? []).find(
          (row) =>
            row.userId === input.userId && row.requestId === input.requestId
        );
        if (existing) return existing;
      }
      const id = memory.__synsightUsageLogId ?? 1;
      memory.__synsightUsageLogId = id + 1;
      const log: UsageLogRecord = {
        id,
        userId: input.userId,
        analysisKey: input.analysisKey,
        creditsCharged: input.creditsCharged,
        status: input.status,
        transactionId: input.transactionId ?? null,
        requestId: input.requestId ?? null,
        createdAt: new Date().toISOString(),
      };
      memory.__synsightUsageLogs = [...(memory.__synsightUsageLogs ?? []), log];
      return log;
    },

    async findUsageByRequestId(userId, requestId) {
      return (
        (memory.__synsightUsageLogs ?? []).find(
          (row) => row.userId === userId && row.requestId === requestId
        ) ?? null
      );
    },

    async consumeAnalysisCreditsAtomic(input) {
      await this.ensureAccount(input.userId);
      if (input.requestId) {
        const prior = await this.findUsageByRequestId(
          input.userId,
          input.requestId
        );
        if (prior?.status === "completed") {
          const account = await this.ensureAccount(input.userId);
          return {
            status: "completed" as const,
            alreadyConsumed: true,
            creditsCharged: prior.creditsCharged,
            balance: account.balance,
            transactionId: prior.transactionId ?? 0,
            usageLogId: prior.id,
          };
        }
        if (prior?.status === "refunded") {
          try {
            const result = await this.applyCreditChange({
              userId: input.userId,
              type: "consume",
              amount: -input.credits,
              description: `${input.label} (${input.credits} SynCredits)`,
              analysisKey: input.analysisKey,
              metadataJson: { requestId: input.requestId },
              transactionSource: "analysis",
            });
            prior.status = "completed";
            prior.creditsCharged = input.credits;
            prior.transactionId = result.transaction.id;
            return {
              status: "completed" as const,
              alreadyConsumed: false,
              creditsCharged: input.credits,
              balance: result.account.balance,
              transactionId: result.transaction.id,
              usageLogId: prior.id,
            };
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "INSUFFICIENT_CREDITS"
            ) {
              return {
                status: "insufficient" as const,
                alreadyConsumed: false,
                creditsCharged: 0,
                balance: (await this.ensureAccount(input.userId)).balance,
                transactionId: 0,
                usageLogId: prior.id,
              };
            }
            throw error;
          }
        }
      }

      try {
        const result = await this.applyCreditChange({
          userId: input.userId,
          type: "consume",
          amount: -input.credits,
          description: `${input.label} (${input.credits} SynCredits)`,
          analysisKey: input.analysisKey,
          metadataJson: { requestId: input.requestId },
          transactionSource: "analysis",
        });
        const usage = await this.createUsageLog({
          userId: input.userId,
          analysisKey: input.analysisKey,
          creditsCharged: input.credits,
          status: "completed",
          transactionId: result.transaction.id,
          requestId: input.requestId,
        });
        return {
          status: "completed" as const,
          alreadyConsumed: false,
          creditsCharged: input.credits,
          balance: result.account.balance,
          transactionId: result.transaction.id,
          usageLogId: usage.id,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "INSUFFICIENT_CREDITS"
        ) {
          return {
            status: "insufficient" as const,
            alreadyConsumed: false,
            creditsCharged: 0,
            balance: (await this.ensureAccount(input.userId)).balance,
            transactionId: 0,
            usageLogId: 0,
          };
        }
        if (input.requestId) {
          const raced = await this.findUsageByRequestId(
            input.userId,
            input.requestId
          );
          if (raced?.status === "completed") {
            const account = await this.ensureAccount(input.userId);
            return {
              status: "completed" as const,
              alreadyConsumed: true,
              creditsCharged: raced.creditsCharged,
              balance: account.balance,
              transactionId: raced.transactionId ?? 0,
              usageLogId: raced.id,
            };
          }
        }
        throw error;
      }
    },

    async refundAnalysisCreditsAtomic(input) {
      const usage = await this.findUsageByRequestId(
        input.userId,
        input.requestId
      );
      if (!usage) return { status: "not_found" as const };
      if (usage.status === "refunded") {
        const account = await this.ensureAccount(input.userId);
        return {
          status: "already_refunded" as const,
          balance: account.balance,
          creditsRefunded: 0,
        };
      }
      if (usage.status !== "completed") {
        return { status: "not_completed" as const };
      }
      const result = await this.applyCreditChange({
        userId: input.userId,
        type: "refund",
        amount: usage.creditsCharged,
        description: `Erstattung Analyse (${input.reason})`,
        analysisKey: usage.analysisKey,
        usageLogId: usage.id,
        metadataJson: { requestId: input.requestId, reason: input.reason },
        transactionSource: "refund",
      });
      // Reverse lifetime spent for the original consume
      const account = await this.ensureAccount(input.userId);
      account.lifetimeSpent = Math.max(
        0,
        account.lifetimeSpent - usage.creditsCharged
      );
      usage.status = "refunded";
      return {
        status: "refunded" as const,
        balance: result.account.balance,
        creditsRefunded: usage.creditsCharged,
      };
    },

    async createInvoice(input) {
      void input;
      const id = memory.__synsightInvoiceId ?? 1;
      memory.__synsightInvoiceId = id + 1;
      return {
        id,
        invoiceNumber: `SYN-${new Date().getFullYear()}-${String(id).padStart(6, "0")}`,
      };
    },
  };
}

export { totalCredits };
