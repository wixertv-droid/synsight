import { desc, eq, inArray, sql } from "drizzle-orm";
import type { SynSightDatabase } from "@/lib/database/client";
import { sessions, supportTickets, users } from "@/lib/database/schema";
import {
  createInMemorySupportTicketRepository,
  type CreateSupportTicketInput,
  type SupportTicketRepository,
} from "../support-repository";

function mapRow(row: typeof supportTickets.$inferSelect) {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    userId: row.userId,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assignedTo,
    source: row.source,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function nextTicketNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `SYN-${stamp}-${suffix}`;
}

export function createMysqlSupportTicketRepository(
  db: SynSightDatabase
): SupportTicketRepository {
  return {
    async create(input: CreateSupportTicketInput) {
      await db.insert(supportTickets).values({
        ticketNumber: nextTicketNumber(),
        userId: input.userId ?? null,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        priority: input.priority ?? "normal",
        source: input.source ?? "public",
      });
      const rows = await db
        .select()
        .from(supportTickets)
        .orderBy(desc(supportTickets.id))
        .limit(1);
      return mapRow(rows[0]);
    },
    async listForUser(userId, limit = 50) {
      const rows = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, userId))
        .orderBy(desc(supportTickets.createdAt))
        .limit(limit);
      return rows.map(mapRow);
    },
    async listAll(params) {
      const limit = params?.limit ?? 100;
      let query = db.select().from(supportTickets).$dynamic();
      if (params?.status) {
        query = query.where(eq(supportTickets.status, params.status));
      }
      const rows = await query
        .orderBy(desc(supportTickets.createdAt))
        .limit(limit);
      return rows.map(mapRow);
    },
    async findById(id) {
      const rows = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.id, id))
        .limit(1);
      return rows[0] ? mapRow(rows[0]) : null;
    },
    async update(id, patch) {
      const set: Partial<typeof supportTickets.$inferInsert> = {};
      if (patch.status !== undefined) set.status = patch.status;
      if (patch.priority !== undefined) set.priority = patch.priority;
      if (patch.assignedTo !== undefined) set.assignedTo = patch.assignedTo;
      if (patch.adminNotes !== undefined) set.adminNotes = patch.adminNotes;
      if (Object.keys(set).length > 0) {
        await db
          .update(supportTickets)
          .set(set)
          .where(eq(supportTickets.id, id));
      }
      return this.findById(id);
    },
    async countOpen() {
      const rows = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportTickets)
        .where(inArray(supportTickets.status, ["new", "open", "waiting"]));
      return Number(rows[0]?.count ?? 0);
    },
  };
}

export function createSupportTicketRepository(
  db: SynSightDatabase | null
): SupportTicketRepository {
  return db
    ? createMysqlSupportTicketRepository(db)
    : createInMemorySupportTicketRepository();
}

export async function isStaffOnline(
  db: SynSightDatabase | null
): Promise<boolean> {
  if (!db) return false;
  const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      sql`${sessions.revokedAt} IS NULL
        AND ${sessions.expiresAt} > CURRENT_TIMESTAMP(3)
        AND ${sessions.lastSeenAt} >= ${threshold}
        AND ${users.role} IN ('admin', 'support')`
    )
    .limit(1);
  return rows.length > 0;
}
