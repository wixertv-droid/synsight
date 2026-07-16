import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import {
  creditAccounts,
  creditPackages,
  creditTransactions,
  invoices,
  payments,
  usageLogs,
} from "@/lib/database/schema";
import {
  createInMemoryCreditsRepository,
  type CreditsRepository,
  type CreditTransactionType,
} from "../credits-repository";

export function createMysqlCreditsRepository(
  db: SynSightDatabase
): CreditsRepository {
  return {
    async ensureAccount(userId) {
      const existing = await this.getAccount(userId);
      if (existing) return existing;
      await db.insert(creditAccounts).values({ userId, balance: 0 });
      return {
        userId,
        balance: 0,
        lifetimePurchased: 0,
        lifetimeSpent: 0,
        lifetimeBonus: 0,
      };
    },

    async getAccount(userId) {
      const rows = await db
        .select()
        .from(creditAccounts)
        .where(eq(creditAccounts.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        userId: row.userId,
        balance: row.balance,
        lifetimePurchased: row.lifetimePurchased,
        lifetimeSpent: row.lifetimeSpent,
        lifetimeBonus: row.lifetimeBonus,
      };
    },

    async listPackages() {
      const rows = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.isActive, true))
        .orderBy(creditPackages.sortOrder);
      return rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        credits: row.credits,
        bonusCredits: row.bonusCredits,
        priceCents: row.priceCents,
        currency: row.currency,
        badge: row.badge,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      }));
    },

    async findPackageByCode(code) {
      const rows = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.code, code))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        credits: row.credits,
        bonusCredits: row.bonusCredits,
        priceCents: row.priceCents,
        currency: row.currency,
        badge: row.badge,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      };
    },

    async listTransactions(userId, limit = 20) {
      const rows = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.id))
        .limit(limit);
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        type: row.type as CreditTransactionType,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        analysisKey: row.analysisKey,
        packageCode: row.packageCode,
        paymentId: row.paymentId,
        usageLogId: row.usageLogId,
        description: row.description,
        metadataJson:
          (row.metadataJson as Record<string, unknown> | null) ?? null,
        createdByAdminId: row.createdByAdminId,
        createdAt: row.createdAt,
      }));
    },

    async sumSpentSince(userId, sinceIso) {
      const rows = await db
        .select({
          total: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, "consume"),
            gte(creditTransactions.createdAt, sinceIso)
          )
        );
      return Number(rows[0]?.total ?? 0);
    },

    async applyCreditChange(input) {
      return db.transaction(async (tx) => {
        await tx
          .insert(creditAccounts)
          .values({ userId: input.userId, balance: 0 })
          .onDuplicateKeyUpdate({ set: { userId: input.userId } });

        const locked = await tx
          .select()
          .from(creditAccounts)
          .where(eq(creditAccounts.userId, input.userId))
          .limit(1);
        const account = locked[0];
        if (!account) throw new Error("CREDIT_ACCOUNT_MISSING");

        const nextBalance = account.balance + input.amount;
        if (nextBalance < 0) throw new Error("INSUFFICIENT_CREDITS");

        const lifetimePurchased =
          account.lifetimePurchased +
          (input.amount > 0 && input.type === "purchase" ? input.amount : 0);
        const lifetimeBonus =
          account.lifetimeBonus +
          (input.amount > 0 &&
          (input.type === "bonus" || input.type === "admin_grant")
            ? input.amount
            : 0);
        const lifetimeSpent =
          account.lifetimeSpent +
          (input.amount < 0 ? Math.abs(input.amount) : 0);

        await tx
          .update(creditAccounts)
          .set({
            balance: nextBalance,
            lifetimePurchased,
            lifetimeBonus,
            lifetimeSpent,
          })
          .where(eq(creditAccounts.userId, input.userId));

        const inserted = await tx.insert(creditTransactions).values({
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
        });
        const transactionId = Number(inserted[0].insertId);

        return {
          account: {
            userId: input.userId,
            balance: nextBalance,
            lifetimePurchased,
            lifetimeSpent,
            lifetimeBonus,
          },
          transaction: {
            id: transactionId,
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
          },
        };
      });
    },

    async createPayment(input) {
      const amount = (input.amountCents / 100).toFixed(2);
      const inserted = await db.insert(payments).values({
        userId: input.userId,
        purpose: "credits",
        packageId: input.packageId,
        amount,
        amountCents: input.amountCents,
        currency: input.currency,
        status: input.status,
        provider: input.provider,
        providerReference: input.providerReference ?? null,
        paidAt: input.paidAt ?? null,
      });
      const id = Number(inserted[0].insertId);
      return {
        id,
        userId: input.userId,
        purpose: "credits",
        packageId: input.packageId,
        amount,
        amountCents: input.amountCents,
        currency: input.currency,
        status: input.status,
        provider: input.provider,
        providerReference: input.providerReference ?? null,
        paidAt: input.paidAt ?? null,
        createdAt: new Date().toISOString(),
      };
    },

    async completePayment(paymentId) {
      const paidAt = new Date().toISOString().slice(0, 23).replace("T", " ");
      await db
        .update(payments)
        .set({ status: "completed", paidAt })
        .where(eq(payments.id, paymentId));
      const rows = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        userId: row.userId,
        purpose: (row.purpose as "credits") ?? "credits",
        packageId: row.packageId,
        amount: String(row.amount),
        amountCents: row.amountCents,
        currency: row.currency,
        status: row.status,
        provider: row.provider,
        providerReference: row.providerReference,
        paidAt: row.paidAt,
        createdAt: row.createdAt,
      };
    },

    async createUsageLog(input) {
      const inserted = await db.insert(usageLogs).values({
        userId: input.userId,
        analysisKey: input.analysisKey,
        creditsCharged: input.creditsCharged,
        status: input.status,
        transactionId: input.transactionId ?? null,
        requestId: input.requestId ?? null,
      });
      const id = Number(inserted[0].insertId);
      return {
        id,
        userId: input.userId,
        analysisKey: input.analysisKey,
        creditsCharged: input.creditsCharged,
        status: input.status,
        transactionId: input.transactionId ?? null,
        requestId: input.requestId ?? null,
        createdAt: new Date().toISOString(),
      };
    },

    async createInvoice(input) {
      const year = new Date().getFullYear();
      const invoiceNumber = `SYN-${year}-${String(Date.now()).slice(-8)}`;
      const inserted = await db.insert(invoices).values({
        userId: input.userId,
        paymentId: input.paymentId,
        invoiceNumber,
        amountCents: input.amountCents,
        currency: input.currency,
        status: "paid",
        issuedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
        paidAt: new Date().toISOString().slice(0, 23).replace("T", " "),
      });
      return { id: Number(inserted[0].insertId), invoiceNumber };
    },
  };
}

export function createCreditsRepository(
  db: SynSightDatabase | null
): CreditsRepository {
  if (db) return createMysqlCreditsRepository(db);
  return createInMemoryCreditsRepository();
}
