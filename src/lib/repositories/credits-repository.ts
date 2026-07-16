import {
  CREDIT_PACKAGE_DEFINITIONS,
  totalCredits,
} from "@/lib/credits/pricing";

export type CreditTransactionType =
  | "purchase"
  | "consume"
  | "bonus"
  | "admin_grant"
  | "admin_revoke"
  | "refund"
  | "adjustment";

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
    memory.__synsightCreditPackages = CREDIT_PACKAGE_DEFINITIONS.map(
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
