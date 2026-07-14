import { and, eq, gt, isNull } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { sessions } from "@/lib/database/schema";
import type { Session } from "@/types/domain";
import {
  createInMemorySessionRepository,
  type CreateSessionInput,
  type SessionRepository,
} from "../session-repository";

function mapSession(row: typeof sessions.$inferSelect): Session {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    expiresAt: row.expiresAt,
    lastSeenAt: row.lastSeenAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

export function createMysqlSessionRepository(db: SynSightDatabase): SessionRepository {
  return {
    async create(input: CreateSessionInput) {
      const now = new Date().toISOString().slice(0, 23).replace("T", " ");
      await db.insert(sessions).values({
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt: input.expiresAt,
        lastSeenAt: now,
      });

      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.id))
        .limit(1);

      return mapSession(rows[0]);
    },

    async findActiveByTokenHash(tokenHash) {
      const now = new Date().toISOString().slice(0, 23).replace("T", " ");
      const rows = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, now)
          )
        )
        .limit(1);

      return rows[0] ? mapSession(rows[0]) : null;
    },

    async touch(id) {
      await db
        .update(sessions)
        .set({
          lastSeenAt: new Date().toISOString().slice(0, 23).replace("T", " "),
        })
        .where(eq(sessions.id, id));
    },

    async revoke(id) {
      await db
        .update(sessions)
        .set({
          revokedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
        })
        .where(eq(sessions.id, id));
    },

    async revokeAllForUser(userId) {
      await db
        .update(sessions)
        .set({
          revokedAt: new Date().toISOString().slice(0, 23).replace("T", " "),
        })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    },
  };
}

export function createSessionRepository(db: SynSightDatabase | null): SessionRepository {
  if (db) {
    return createMysqlSessionRepository(db);
  }
  return createInMemorySessionRepository();
}
