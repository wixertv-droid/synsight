import { eq, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { profiles, users } from "@/lib/database/schema";
import type { UserRole } from "@/lib/auth/types";
import {
  createInMemoryUserRepository,
  type UserRecord,
  type UserRepository,
} from "../user-repository";

function resolveRole(username: string): UserRole {
  return username.toLowerCase() === "admin" ? "admin" : "demo";
}

export function createMysqlUserRepository(
  db: SynSightDatabase
): UserRepository {
  return {
    async findByUsername(username: string) {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          passwordHash: users.passwordHash,
          status: users.status,
          failedLoginAttempts: users.failedLoginAttempts,
          lockedUntil: users.lockedUntil,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.username, username.trim().toLowerCase()))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.passwordHash,
        status: row.status,
        firstName: row.firstName,
        lastName: row.lastName,
        role: resolveRole(row.username),
        failedLoginAttempts: row.failedLoginAttempts,
        lockedUntil: row.lockedUntil,
      } satisfies UserRecord;
    },

    async findByEmail(email: string) {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          passwordHash: users.passwordHash,
          status: users.status,
          failedLoginAttempts: users.failedLoginAttempts,
          lockedUntil: users.lockedUntil,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.passwordHash,
        status: row.status,
        firstName: row.firstName,
        lastName: row.lastName,
        role: resolveRole(row.username),
        failedLoginAttempts: row.failedLoginAttempts,
        lockedUntil: row.lockedUntil,
      } satisfies UserRecord;
    },

    async findById(id: number) {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          passwordHash: users.passwordHash,
          status: users.status,
          failedLoginAttempts: users.failedLoginAttempts,
          lockedUntil: users.lockedUntil,
          firstName: profiles.firstName,
          lastName: profiles.lastName,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, id))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.passwordHash,
        status: row.status,
        firstName: row.firstName,
        lastName: row.lastName,
        role: resolveRole(row.username),
        failedLoginAttempts: row.failedLoginAttempts,
        lockedUntil: row.lockedUntil,
      } satisfies UserRecord;
    },

    async create(input) {
      return db.transaction(async (transaction) => {
        const result = await transaction.insert(users).values({
          email: input.email,
          username: input.username,
          passwordHash: input.passwordHash,
          status: "pending_verification",
        });
        const id = Number(result[0].insertId);
        await transaction.insert(profiles).values({
          userId: id,
          firstName: input.firstName,
          lastName: input.lastName,
          region: "EU",
          locale: "de-DE",
          onboardingStep: 0,
        });
        return {
          id,
          email: input.email,
          username: input.username,
          passwordHash: input.passwordHash,
          status: "pending_verification",
          firstName: input.firstName,
          lastName: input.lastName,
          role: resolveRole(input.username),
          failedLoginAttempts: 0,
          lockedUntil: null,
        };
      });
    },

    async activate(id) {
      await db
        .update(users)
        .set({
          status: "active",
          emailVerifiedAt: sql`CURRENT_TIMESTAMP(3)`,
        })
        .where(eq(users.id, id));
    },

    async recordFailedLogin(id, lockedUntil) {
      await db
        .update(users)
        .set({
          failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`,
          lockedUntil,
        })
        .where(eq(users.id, id));
    },

    async clearFailedLogins(id) {
      await db
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(users.id, id));
    },

    async updateLastLogin(id: number) {
      await db
        .update(users)
        .set({
          lastLoginAt: new Date().toISOString().slice(0, 23).replace("T", " "),
        })
        .where(eq(users.id, id));
    },
  };
}

export function createUserRepository(
  db: SynSightDatabase | null
): UserRepository {
  if (db) {
    return createMysqlUserRepository(db);
  }
  return createInMemoryUserRepository();
}

export async function findUserByIdentifier(
  repository: UserRepository,
  identifier: string
): Promise<UserRecord | null> {
  const normalized = identifier.trim();
  const byUsername = await repository.findByUsername(normalized);
  if (byUsername) return byUsername;

  if (normalized.includes("@")) {
    return repository.findByEmail(normalized);
  }

  return null;
}
