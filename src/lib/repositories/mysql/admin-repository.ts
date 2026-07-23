import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import {
  auditEvents,
  creditAccounts,
  profileAliases,
  profiles,
  securityProfiles,
  sessions,
  users,
} from "@/lib/database/schema";
import {
  createInMemoryAdminRepository,
  type AdminRepository,
  type AdminUserListRow,
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

    async getUserOverviewStats() {
      const [
        totals,
        today,
        week,
        month,
        verified,
        active,
        blocked,
        admins,
        creditsAvg,
        lastLogin,
      ] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(users),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(sql`DATE(${users.createdAt}) = CURRENT_DATE()`),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(sql`${users.createdAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(sql`${users.createdAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(sql`${users.emailVerifiedAt} IS NOT NULL`),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(eq(users.status, "active")),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(sql`${users.status} IN ('suspended', 'deleted')`),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(eq(users.role, "admin")),
        db
          .select({
            avg: sql<number>`COALESCE(AVG(${creditAccounts.balance}), 0)`,
          })
          .from(creditAccounts),
        db.select({ last: sql<string>`MAX(${users.lastLoginAt})` }).from(users),
      ]);

      const usersTotal = Number(totals[0]?.count ?? 0);
      const verifiedUsers = Number(verified[0]?.count ?? 0);

      return {
        usersTotal,
        registrationsToday: Number(today[0]?.count ?? 0),
        registrationsThisWeek: Number(week[0]?.count ?? 0),
        registrationsThisMonth: Number(month[0]?.count ?? 0),
        verifiedUsers,
        unverifiedUsers: Math.max(0, usersTotal - verifiedUsers),
        activeUsers: Number(active[0]?.count ?? 0),
        blockedUsers: Number(blocked[0]?.count ?? 0),
        lastLoginAt: lastLogin[0]?.last ?? null,
        administratorsTotal: Number(admins[0]?.count ?? 0),
        supportStaffTotal: 0,
        moderatorsTotal: 0,
        averageSynCredits: Math.round(Number(creditsAvg[0]?.avg ?? 0)),
      };
    },

    async listUsers(params) {
      const page = Math.max(1, params.page ?? 1);
      const limit = Math.min(100, Math.max(1, params.limit ?? 25));
      const offset = (page - 1) * limit;
      const normalized = (params.query ?? "").trim();
      const pattern = `%${normalized}%`;

      const filters = [];
      if (normalized) {
        filters.push(
          or(
            like(users.email, pattern),
            like(users.username, pattern),
            like(profiles.firstName, pattern),
            like(profiles.lastName, pattern),
            like(profiles.publicAlias, pattern),
            sql`CAST(${users.id} AS CHAR) LIKE ${pattern}`
          )
        );
      }
      if (params.status) filters.push(eq(users.status, params.status as never));
      if (params.role) filters.push(eq(users.role, params.role as never));

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const sortColumn =
        params.sort === "created"
          ? users.createdAt
          : params.sort === "login"
            ? users.lastLoginAt
            : params.sort === "credits"
              ? creditAccounts.balance
              : users.id;

      const directionFn = params.direction === "asc" ? asc : desc;

      let countQuery = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .$dynamic();
      if (whereClause) countQuery = countQuery.where(whereClause);
      const countRows = await countQuery;
      const total = Number(countRows[0]?.count ?? 0);

      let listQuery = db
        .select({
          ...userFields,
          synCredits: sql<number>`COALESCE(${creditAccounts.balance}, 0)`,
          riskScore: securityProfiles.securityScore,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .leftJoin(creditAccounts, eq(creditAccounts.userId, users.id))
        .leftJoin(securityProfiles, eq(securityProfiles.userId, users.id))
        .$dynamic();
      if (whereClause) listQuery = listQuery.where(whereClause);
      const rows = await listQuery
        .orderBy(directionFn(sortColumn))
        .limit(limit)
        .offset(offset);

      const mapped: AdminUserListRow[] = await Promise.all(
        rows.map(async (row) => ({
          ...mapUser(
            row as Omit<AdminUserSummary, "aliases"> & {
              role: "admin" | "user";
            },
            await aliasesFor(row.id)
          ),
          synCredits: Number(row.synCredits ?? 0),
          riskScore: row.riskScore ?? null,
          verified: Boolean(row.emailVerifiedAt),
        }))
      );

      return { users: mapped, total, page, limit };
    },

    async listUserSessions(userId, limit = 30) {
      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.lastSeenAt))
        .limit(limit);
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        revokedAt: row.revokedAt,
      }));
    },

    async listAuditEvents(params) {
      const limit = Math.min(200, Math.max(1, params.limit ?? 50));
      let query = db.select().from(auditEvents).$dynamic();
      if (params.userId) {
        query = query.where(eq(auditEvents.userId, params.userId));
      }
      const rows = await query
        .orderBy(desc(auditEvents.createdAt))
        .limit(limit);
      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        eventType: row.eventType,
        entityType: row.entityType,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        metadataJson:
          (row.metadataJson as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt,
      }));
    },
  };
}

export function createAdminRepository(
  db: SynSightDatabase | null
): AdminRepository {
  return db ? createMysqlAdminRepository(db) : createInMemoryAdminRepository();
}
