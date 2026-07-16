import { eq, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { profiles, users } from "@/lib/database/schema";
import type { UserRole } from "@/lib/auth/types";
import {
  createInMemoryUserRepository,
  type UserRecord,
  type UserRepository,
} from "../user-repository";

function normalizeRole(
  role: string | null | undefined,
  username: string
): UserRole {
  if (role === "admin" || role === "demo") return role;
  return username.toLowerCase() === "admin" ? "admin" : "demo";
}

function mapUserRow(row: {
  id: number;
  email: string;
  username: string;
  passwordHash: string;
  status: UserRecord["status"];
  role: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  firstName: string | null;
  lastName: string | null;
}): UserRecord {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.passwordHash,
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    role: normalizeRole(row.role, row.username),
    failedLoginAttempts: row.failedLoginAttempts,
    lockedUntil: row.lockedUntil,
  };
}

const userSelect = {
  id: users.id,
  email: users.email,
  username: users.username,
  passwordHash: users.passwordHash,
  status: users.status,
  role: users.role,
  failedLoginAttempts: users.failedLoginAttempts,
  lockedUntil: users.lockedUntil,
  firstName: profiles.firstName,
  lastName: profiles.lastName,
};

export function createMysqlUserRepository(
  db: SynSightDatabase
): UserRepository {
  return {
    async findByUsername(username: string) {
      const rows = await db
        .select(userSelect)
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.username, username.trim().toLowerCase()))
        .limit(1);

      const row = rows[0];
      return row ? mapUserRow(row) : null;
    },

    async findByEmail(email: string) {
      const rows = await db
        .select(userSelect)
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);

      const row = rows[0];
      return row ? mapUserRow(row) : null;
    },

    async findById(id: number) {
      const rows = await db
        .select(userSelect)
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, id))
        .limit(1);

      const row = rows[0];
      return row ? mapUserRow(row) : null;
    },

    async create(input) {
      return db.transaction(async (transaction) => {
        const result = await transaction.insert(users).values({
          email: input.email,
          username: input.username,
          passwordHash: input.passwordHash,
          status: "pending_verification",
          role: "demo",
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
          role: "demo",
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
