import { and, eq, gt, isNull } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { userTokens } from "@/lib/database/schema";
import {
  createInMemoryUserTokenRepository,
  type UserTokenRepository,
} from "../user-token-repository";

const mysqlDate = () => new Date().toISOString().slice(0, 23).replace("T", " ");

export function createMysqlUserTokenRepository(
  db: SynSightDatabase
): UserTokenRepository {
  return {
    async create(input) {
      const result = await db.insert(userTokens).values(input);
      const id = Number(result[0].insertId);
      return {
        id,
        ...input,
        usedAt: null,
        createdAt: new Date().toISOString(),
      };
    },
    async findValid(tokenHash, tokenType) {
      const rows = await db
        .select()
        .from(userTokens)
        .where(
          and(
            eq(userTokens.tokenHash, tokenHash),
            eq(userTokens.tokenType, tokenType),
            isNull(userTokens.usedAt),
            gt(userTokens.expiresAt, mysqlDate())
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },
    async findByHash(tokenHash, tokenType) {
      const rows = await db
        .select()
        .from(userTokens)
        .where(
          and(
            eq(userTokens.tokenHash, tokenHash),
            eq(userTokens.tokenType, tokenType)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    },
    async markUsed(id) {
      await db
        .update(userTokens)
        .set({ usedAt: mysqlDate() })
        .where(eq(userTokens.id, id));
    },
    async revokeForUser(userId, tokenType) {
      await db
        .update(userTokens)
        .set({ usedAt: mysqlDate() })
        .where(
          and(
            eq(userTokens.userId, userId),
            eq(userTokens.tokenType, tokenType),
            isNull(userTokens.usedAt)
          )
        );
    },
  };
}

export function createUserTokenRepository(
  db: SynSightDatabase | null
): UserTokenRepository {
  return db
    ? createMysqlUserTokenRepository(db)
    : createInMemoryUserTokenRepository();
}
