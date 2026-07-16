import { eq, like, or, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { profileAliases, profiles, users } from "@/lib/database/schema";
import {
  createInMemoryAdminRepository,
  type AdminRepository,
  type AdminUserSummary,
} from "../admin-repository";

const userFields = {
  id: users.id,
  email: users.email,
  username: users.username,
  status: users.status,
  role: users.role,
  firstName: profiles.firstName,
  lastName: profiles.lastName,
  publicAlias: profiles.publicAlias,
  createdAt: users.createdAt,
  emailVerifiedAt: users.emailVerifiedAt,
  lastLoginAt: users.lastLoginAt,
};

function mapUser(
  row: Omit<AdminUserSummary, "aliases"> & { role: "admin" | "user" },
  aliases: string[] = []
): AdminUserSummary {
  return { ...row, aliases };
}

export function createMysqlAdminRepository(
  db: SynSightDatabase
): AdminRepository {
  async function aliasesFor(userId: number): Promise<string[]> {
    const rows = await db
      .select({ alias: profileAliases.alias })
      .from(profileAliases)
      .where(eq(profileAliases.userId, userId));
    return rows.map((row) => row.alias);
  }

  return {
    async searchUsers(query, limit = 25) {
      const normalized = query.trim();
      const pattern = `%${normalized}%`;
      const condition = normalized
        ? or(
            like(users.email, pattern),
            like(users.username, pattern),
            like(profiles.firstName, pattern),
            like(profiles.lastName, pattern),
            like(profiles.publicAlias, pattern),
            sql`CAST(${users.id} AS CHAR) LIKE ${pattern}`,
            sql`EXISTS (
              SELECT 1 FROM ${profileAliases}
              WHERE ${profileAliases.userId} = ${users.id}
                AND ${profileAliases.alias} LIKE ${pattern}
            )`
          )
        : undefined;

      let statement = db
        .select(userFields)
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .$dynamic();
      if (condition) statement = statement.where(condition);
      const rows = await statement.orderBy(users.id).limit(limit);

      return Promise.all(
        rows.map(async (row) =>
          mapUser(
            row as Omit<AdminUserSummary, "aliases"> & {
              role: "admin" | "user";
            },
            await aliasesFor(row.id)
          )
        )
      );
    },

    async findUserById(userId) {
      const rows = await db
        .select(userFields)
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return mapUser(
        row as Omit<AdminUserSummary, "aliases"> & {
          role: "admin" | "user";
        },
        await aliasesFor(userId)
      );
    },

    async getSystemStats() {
      const [totals, admins, today] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(users),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(eq(users.role, "admin")),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(sql`DATE(${users.createdAt}) = CURRENT_DATE()`),
      ]);
      return {
        usersTotal: Number(totals[0]?.count ?? 0),
        administratorsTotal: Number(admins[0]?.count ?? 0),
        registrationsToday: Number(today[0]?.count ?? 0),
      };
    },
  };
}

export function createAdminRepository(
  db: SynSightDatabase | null
): AdminRepository {
  return db ? createMysqlAdminRepository(db) : createInMemoryAdminRepository();
}
