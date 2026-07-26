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
  type CreditTransactionSource,
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
        performedBy: row.performedBy,
        reason: row.reason,
        transactionSource: row.transactionSource as CreditTransactionSource,
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

        const purchasedDelta =
          input.amount > 0 && input.type === "purchase" ? input.amount : 0;
        const bonusDelta =
          input.amount > 0 &&
          (input.type === "bonus" || input.type === "admin_grant")
            ? input.amount
            : 0;
        const spentDelta = input.amount < 0 ? Math.abs(input.amount) : 0;

        // Atomic conditional update: concurrent admin/API changes cannot lose
        // balance updates, and the balance can never become negative.
        const updated = await tx
          .update(creditAccounts)
          .set({
            balance: sql`${creditAccounts.balance} + ${input.amount}`,
            lifetimePurchased: sql`${creditAccounts.lifetimePurchased} + ${purchasedDelta}`,
            lifetimeBonus: sql`${creditAccounts.lifetimeBonus} + ${bonusDelta}`,
            lifetimeSpent: sql`${creditAccounts.lifetimeSpent} + ${spentDelta}`,
          })
          .where(
            and(
              eq(creditAccounts.userId, input.userId),
              sql`${creditAccounts.balance} + ${input.amount} >= 0`
            )
          );
        if (Number(updated[0].affectedRows) !== 1) {
          throw new Error("INSUFFICIENT_CREDITS");
        }

        const rows = await tx
          .select()
          .from(creditAccounts)
          .where(eq(creditAccounts.userId, input.userId))
          .limit(1);
        const account = rows[0];
        if (!account) throw new Error("CREDIT_ACCOUNT_MISSING");
        const nextBalance = account.balance;
        const lifetimePurchased = account.lifetimePurchased;
        const lifetimeBonus = account.lifetimeBonus;
        const lifetimeSpent = account.lifetimeSpent;

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
          performedBy: input.performedBy ?? input.createdByAdminId ?? null,
          reason: input.reason ?? input.description,
          transactionSource: input.transactionSource ?? "adjustment",
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
            performedBy: input.performedBy ?? input.createdByAdminId ?? null,
            reason: input.reason ?? input.description,
            transactionSource: input.transactionSource ?? "adjustment",
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
      if (input.requestId) {
        const existing = await this.findUsageByRequestId(
          input.userId,
          input.requestId
        );
        if (existing) return existing;
      }
      try {
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
      } catch (error) {
        if (input.requestId) {
          const raced = await this.findUsageByRequestId(
            input.userId,
            input.requestId
          );
          if (raced) return raced;
        }
        throw error;
      }
    },

    async findUsageByRequestId(userId, requestId) {
      const rows = await db
        .select()
        .from(usageLogs)
        .where(
          and(eq(usageLogs.userId, userId), eq(usageLogs.requestId, requestId))
        )
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        userId: row.userId,
        analysisKey: row.analysisKey,
        creditsCharged: row.creditsCharged,
        status: row.status,
        transactionId: row.transactionId,
        requestId: row.requestId,
        createdAt: row.createdAt,
      };
    },

    async consumeAnalysisCreditsAtomic(input) {
      try {
        return await db.transaction(async (tx) => {
          await tx
            .insert(creditAccounts)
            .values({ userId: input.userId, balance: 0 })
            .onDuplicateKeyUpdate({ set: { userId: input.userId } });

          if (input.requestId) {
            const existingRows = await tx
              .select()
              .from(usageLogs)
              .where(
                and(
                  eq(usageLogs.userId, input.userId),
                  eq(usageLogs.requestId, input.requestId)
                )
              )
              .limit(1);
            const existing = existingRows[0];
            if (existing?.status === "completed") {
              const accounts = await tx
                .select()
                .from(creditAccounts)
                .where(eq(creditAccounts.userId, input.userId))
                .limit(1);
              return {
                status: "completed" as const,
                alreadyConsumed: true,
                creditsCharged: existing.creditsCharged,
                balance: accounts[0]?.balance ?? 0,
                transactionId: existing.transactionId ?? 0,
                usageLogId: existing.id,
              };
            }

            if (existing?.status === "refunded") {
              const updated = await tx
                .update(creditAccounts)
                .set({
                  balance: sql`${creditAccounts.balance} - ${input.credits}`,
                  lifetimeSpent: sql`${creditAccounts.lifetimeSpent} + ${input.credits}`,
                })
                .where(
                  and(
                    eq(creditAccounts.userId, input.userId),
                    sql`${creditAccounts.balance} >= ${input.credits}`
                  )
                );
              if (Number(updated[0].affectedRows) !== 1) {
                const accounts = await tx
                  .select()
                  .from(creditAccounts)
                  .where(eq(creditAccounts.userId, input.userId))
                  .limit(1);
                return {
                  status: "insufficient" as const,
                  alreadyConsumed: false,
                  creditsCharged: 0,
                  balance: accounts[0]?.balance ?? 0,
                  transactionId: 0,
                  usageLogId: existing.id,
                };
              }
              const accounts = await tx
                .select()
                .from(creditAccounts)
                .where(eq(creditAccounts.userId, input.userId))
                .limit(1);
              const balance = accounts[0]?.balance ?? 0;
              const inserted = await tx.insert(creditTransactions).values({
                userId: input.userId,
                type: "consume",
                amount: -input.credits,
                balanceAfter: balance,
                analysisKey: input.analysisKey,
                description: `${input.label} (${input.credits} SynCredits)`,
                metadataJson: { requestId: input.requestId },
                transactionSource: "analysis",
              });
              const transactionId = Number(inserted[0].insertId);
              await tx
                .update(usageLogs)
                .set({
                  status: "completed",
                  creditsCharged: input.credits,
                  transactionId,
                  analysisKey: input.analysisKey,
                })
                .where(eq(usageLogs.id, existing.id));
              return {
                status: "completed" as const,
                alreadyConsumed: false,
                creditsCharged: input.credits,
                balance,
                transactionId,
                usageLogId: existing.id,
              };
            }
          }

          const updated = await tx
            .update(creditAccounts)
            .set({
              balance: sql`${creditAccounts.balance} - ${input.credits}`,
              lifetimeSpent: sql`${creditAccounts.lifetimeSpent} + ${input.credits}`,
            })
            .where(
              and(
                eq(creditAccounts.userId, input.userId),
                sql`${creditAccounts.balance} >= ${input.credits}`
              )
            );
          if (Number(updated[0].affectedRows) !== 1) {
            const accounts = await tx
              .select()
              .from(creditAccounts)
              .where(eq(creditAccounts.userId, input.userId))
              .limit(1);
            return {
              status: "insufficient" as const,
              alreadyConsumed: false,
              creditsCharged: 0,
              balance: accounts[0]?.balance ?? 0,
              transactionId: 0,
              usageLogId: 0,
            };
          }

          const accounts = await tx
            .select()
            .from(creditAccounts)
            .where(eq(creditAccounts.userId, input.userId))
            .limit(1);
          const balance = accounts[0]?.balance ?? 0;
          const insertedTx = await tx.insert(creditTransactions).values({
            userId: input.userId,
            type: "consume",
            amount: -input.credits,
            balanceAfter: balance,
            analysisKey: input.analysisKey,
            description: `${input.label} (${input.credits} SynCredits)`,
            metadataJson: { requestId: input.requestId },
            transactionSource: "analysis",
          });
          const transactionId = Number(insertedTx[0].insertId);
          const insertedUsage = await tx.insert(usageLogs).values({
            userId: input.userId,
            analysisKey: input.analysisKey,
            creditsCharged: input.credits,
            status: "completed",
            transactionId,
            requestId: input.requestId,
          });
          return {
            status: "completed" as const,
            alreadyConsumed: false,
            creditsCharged: input.credits,
            balance,
            transactionId,
            usageLogId: Number(insertedUsage[0].insertId),
          };
        });
      } catch (error) {
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
      return db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(usageLogs)
          .where(
            and(
              eq(usageLogs.userId, input.userId),
              eq(usageLogs.requestId, input.requestId)
            )
          )
          .limit(1);
        const usage = rows[0];
        if (!usage) return { status: "not_found" as const };
        if (usage.status === "refunded") {
          const accounts = await tx
            .select()
            .from(creditAccounts)
            .where(eq(creditAccounts.userId, input.userId))
            .limit(1);
          return {
            status: "already_refunded" as const,
            balance: accounts[0]?.balance ?? 0,
            creditsRefunded: 0,
          };
        }
        if (usage.status !== "completed") {
          return { status: "not_completed" as const };
        }

        const credits = usage.creditsCharged;
        await tx
          .update(creditAccounts)
          .set({
            balance: sql`${creditAccounts.balance} + ${credits}`,
            lifetimeSpent: sql`GREATEST(0, ${creditAccounts.lifetimeSpent} - ${credits})`,
          })
          .where(eq(creditAccounts.userId, input.userId));

        const accounts = await tx
          .select()
          .from(creditAccounts)
          .where(eq(creditAccounts.userId, input.userId))
          .limit(1);
        const balance = accounts[0]?.balance ?? 0;

        await tx.insert(creditTransactions).values({
          userId: input.userId,
          type: "refund",
          amount: credits,
          balanceAfter: balance,
          analysisKey: usage.analysisKey,
          usageLogId: usage.id,
          description: `Erstattung Analyse (${input.reason})`,
          metadataJson: {
            requestId: input.requestId,
            reason: input.reason,
          },
          transactionSource: "refund",
        });

        await tx
          .update(usageLogs)
          .set({ status: "refunded" })
          .where(eq(usageLogs.id, usage.id));

        return {
          status: "refunded" as const,
          balance,
          creditsRefunded: credits,
        };
      });
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
