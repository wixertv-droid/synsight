import type { Session } from "@/types/domain";

export interface CreateSessionInput {
  id: string;
  userId: number;
  tokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: string;
}

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<Session>;
  findActiveByTokenHash(tokenHash: string): Promise<Session | null>;
  touch(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: number): Promise<void>;
}

const memory = globalThis as typeof globalThis & {
  __synsightSessions?: Map<string, Session>;
};

export function createInMemorySessionRepository(): SessionRepository {
  const sessions =
    memory.__synsightSessions ??
    (memory.__synsightSessions = new Map<string, Session>());

  return {
    async create(input) {
      const now = new Date().toISOString();
      const session: Session = {
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt: input.expiresAt,
        lastSeenAt: now,
        revokedAt: null,
        createdAt: now,
      };
      sessions.set(session.id, session);
      return session;
    },

    async findActiveByTokenHash(tokenHash) {
      for (const session of sessions.values()) {
        if (
          session.tokenHash === tokenHash &&
          !session.revokedAt &&
          new Date(session.expiresAt) > new Date()
        ) {
          return session;
        }
      }
      return null;
    },

    async touch(id) {
      const session = sessions.get(id);
      if (session) {
        session.lastSeenAt = new Date().toISOString();
      }
    },

    async revoke(id) {
      const session = sessions.get(id);
      if (session) {
        session.revokedAt = new Date().toISOString();
      }
    },

    async revokeAllForUser(userId) {
      const now = new Date().toISOString();
      for (const session of sessions.values()) {
        if (session.userId === userId && !session.revokedAt) {
          session.revokedAt = now;
        }
      }
    },
  };
}
