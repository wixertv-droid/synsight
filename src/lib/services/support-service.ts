import type { AuthenticatedUser } from "@/lib/auth/types";
import { canAccessAdminArea } from "@/lib/admin/permissions";
import { getDatabase } from "@/lib/database/client";
import { users } from "@/lib/database/schema";
import { getSupportTicketRepository } from "@/lib/repositories";
import type {
  CreateSupportTicketInput,
  SupportTicketRecord,
  SupportTicketStatus,
} from "@/lib/repositories/support-repository";
import { eq } from "drizzle-orm";

function assertStaff(actor: AuthenticatedUser): void {
  if (!canAccessAdminArea(actor.role)) throw new Error("STAFF_FORBIDDEN");
}

export async function createSupportTicket(
  input: CreateSupportTicketInput
): Promise<SupportTicketRecord> {
  return getSupportTicketRepository().create(input);
}

export async function listUserSupportTickets(
  actor: AuthenticatedUser
): Promise<SupportTicketRecord[]> {
  return getSupportTicketRepository().listForUser(Number(actor.id));
}

export async function listStaffSupportTickets(
  actor: AuthenticatedUser,
  params?: { status?: SupportTicketStatus; limit?: number }
): Promise<SupportTicketRecord[]> {
  assertStaff(actor);
  return getSupportTicketRepository().listAll(params);
}

export async function updateStaffSupportTicket(
  actor: AuthenticatedUser,
  ticketId: number,
  patch: Partial<
    Pick<
      SupportTicketRecord,
      "status" | "priority" | "assignedTo" | "adminNotes"
    >
  >
): Promise<SupportTicketRecord | null> {
  assertStaff(actor);
  return getSupportTicketRepository().update(ticketId, patch);
}

export async function assignUserRole(
  actor: AuthenticatedUser,
  userId: number,
  role: "admin" | "support" | "user"
): Promise<{ id: number; role: string; email: string } | null> {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
  if (Number(actor.id) === userId && role !== "admin") {
    throw new Error("SELF_DEMOTE_FORBIDDEN");
  }

  const db = getDatabase();
  if (!db) {
    return { id: userId, role, email: `user${userId}@example.com` };
  }

  await db.update(users).set({ role }).where(eq(users.id, userId));
  const rows = await db
    .select({ id: users.id, role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, role: row.role, email: row.email };
}

export async function listAssignableUsers(actor: AuthenticatedUser) {
  if (actor.role !== "admin") throw new Error("ADMIN_FORBIDDEN");
  const db = getDatabase();
  if (!db) {
    return [
      { id: 1, email: "admin@synsight.local", role: "admin" as const },
      { id: 2, email: "support@synsight.local", role: "support" as const },
    ];
  }
  const rows = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .orderBy(users.email)
    .limit(200);
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as "admin" | "support" | "user",
  }));
}
