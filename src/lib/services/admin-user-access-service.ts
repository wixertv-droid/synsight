import { eq, sql } from "drizzle-orm";
import type { AuthenticatedUser, UserRole } from "@/lib/auth/types";
import { getDatabase } from "@/lib/database/client";
import { users } from "@/lib/database/schema";
import { getAuditRepository, getSessionRepository } from "@/lib/repositories";
import { resendEmailVerification } from "@/lib/services/verification-service";

export type AdminManagedUserStatus =
  "pending_verification" | "active" | "suspended";

export type AdminUserRoleDefinition = {
  role: UserRole;
  label: string;
  description: string;
  access: string[];
};

export const ADMIN_USER_ROLE_DEFINITIONS: AdminUserRoleDefinition[] = [
  {
    role: "user",
    label: "Benutzer",
    description: "Normales Kundenkonto ohne Mitarbeiterrechte.",
    access: [
      "Eigenes Dashboard",
      "Eigene Analysen",
      "Eigenes Profil",
      "Eigene SynCredits",
    ],
  },
  {
    role: "support",
    label: "Support",
    description:
      "Support-Mitarbeiter für Kundenanfragen und Support-Benutzersuche.",
    access: [
      "Support & Kommunikation",
      "Benutzer im Supportfall suchen",
      "Keine Finanz- oder Systemeinstellungen",
    ],
  },
  {
    role: "worker",
    label: "Worker",
    description:
      "Mitarbeiterrolle für interne Aufträge und Bearbeitungs-Workflows.",
    access: [
      "Auftragsbearbeitung",
      "Interne Worker-Funktionen",
      "Kein vollständiger Adminzugriff",
    ],
  },
  {
    role: "admin",
    label: "Administrator",
    description:
      "Vollzugriff auf Administration, Benutzer, Systeme und Finanzen.",
    access: [
      "Vollständiger Adminbereich",
      "Benutzer- und Rechteverwaltung",
      "Finanzen",
      "System & Sicherheit",
      "APIs & Integrationen",
    ],
  },
];

function assertAdmin(actor: AuthenticatedUser) {
  if (actor.role !== "admin") {
    throw new Error("ADMIN_FORBIDDEN");
  }
}

function actorId(actor: AuthenticatedUser): number {
  const value = Number(actor.id);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("INVALID_ADMIN_ID");
  }
  return value;
}

async function requireTargetUser(userId: number) {
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_REQUIRED");

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) throw new Error("USER_NOT_FOUND");

  return { db, user };
}

async function writeAudit(input: {
  actor: AuthenticatedUser;
  targetUserId: number;
  action: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await getAuditRepository().create({
    userId: input.targetUserId,
    eventType: "admin.action",
    entityType: "user",
    entityId: String(input.targetUserId),
    metadata: {
      action: input.action,
      actorUserId: actorId(input.actor),
      actorEmail: input.actor.email,
      ...(input.metadata ?? {}),
    },
  });
}

export async function changeAdminManagedUserRole(
  actor: AuthenticatedUser,
  targetUserId: number,
  nextRole: UserRole
) {
  assertAdmin(actor);

  const { db, user } = await requireTargetUser(targetUserId);
  const currentAdminId = actorId(actor);

  if (targetUserId === currentAdminId && nextRole !== "admin") {
    throw new Error("SELF_ADMIN_ROLE_CHANGE_FORBIDDEN");
  }

  if (user.role === "admin" && nextRole !== "admin") {
    const rows = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(users)
      .where(eq(users.role, "admin"));

    if (Number(rows[0]?.count ?? 0) <= 1) {
      throw new Error("LAST_ADMIN_PROTECTED");
    }
  }

  if (user.role === nextRole) {
    return {
      changed: false,
      role: user.role,
    };
  }

  await db
    .update(users)
    .set({
      role: nextRole,
    })
    .where(eq(users.id, targetUserId));

  /*
   * Rollen sind Bestandteil der signierten Session.
   * Deshalb bestehende Sessions nach Rollenwechsel beenden.
   */
  await getSessionRepository().revokeAllForUser(targetUserId);

  await writeAudit({
    actor,
    targetUserId,
    action: "admin.user.role_changed",
    metadata: {
      previousRole: user.role,
      nextRole,
      sessionsRevoked: true,
    },
  });

  return {
    changed: true,
    role: nextRole,
    sessionsRevoked: true,
  };
}

export async function changeAdminManagedUserStatus(
  actor: AuthenticatedUser,
  targetUserId: number,
  nextStatus: AdminManagedUserStatus
) {
  assertAdmin(actor);

  const { db, user } = await requireTargetUser(targetUserId);

  if (targetUserId === actorId(actor) && nextStatus !== "active") {
    throw new Error("SELF_SUSPEND_FORBIDDEN");
  }

  if (user.status === nextStatus) {
    return {
      changed: false,
      status: user.status,
    };
  }

  if (nextStatus === "active" && !user.emailVerifiedAt) {
    throw new Error("USER_NOT_VERIFIED");
  }

  await db
    .update(users)
    .set({
      status: nextStatus,
    })
    .where(eq(users.id, targetUserId));

  if (nextStatus === "suspended") {
    await getSessionRepository().revokeAllForUser(targetUserId);
  }

  await writeAudit({
    actor,
    targetUserId,
    action:
      nextStatus === "suspended"
        ? "admin.user.suspended"
        : "admin.user.status_changed",
    metadata: {
      previousStatus: user.status,
      nextStatus,
      sessionsRevoked: nextStatus === "suspended",
    },
  });

  return {
    changed: true,
    status: nextStatus,
  };
}

export async function manuallyVerifyUser(
  actor: AuthenticatedUser,
  targetUserId: number
) {
  assertAdmin(actor);

  const { db, user } = await requireTargetUser(targetUserId);

  if (user.status === "deleted") {
    throw new Error("USER_DELETED");
  }

  if (user.status === "suspended") {
    throw new Error("USER_SUSPENDED");
  }

  if (user.emailVerifiedAt) {
    return {
      changed: false,
      verified: true,
    };
  }

  await db
    .update(users)
    .set({
      emailVerifiedAt: sql`CURRENT_TIMESTAMP(3)`,
      status: "active",
    })
    .where(eq(users.id, targetUserId));

  await writeAudit({
    actor,
    targetUserId,
    action: "admin.user.email_verified",
    metadata: {
      verificationMethod: "manual_admin",
    },
  });

  return {
    changed: true,
    verified: true,
  };
}

export async function resendUserVerification(
  actor: AuthenticatedUser,
  targetUserId: number
) {
  assertAdmin(actor);

  const { user } = await requireTargetUser(targetUserId);

  if (user.status !== "pending_verification") {
    throw new Error("VERIFICATION_RESEND_NOT_AVAILABLE");
  }

  await resendEmailVerification(user.email);

  await writeAudit({
    actor,
    targetUserId,
    action: "admin.user.verification_resent",
  });

  return {
    sent: true,
  };
}

export async function revokeUserSessions(
  actor: AuthenticatedUser,
  targetUserId: number
) {
  assertAdmin(actor);

  await requireTargetUser(targetUserId);

  if (targetUserId === actorId(actor)) {
    throw new Error("SELF_SESSION_REVOKE_FORBIDDEN");
  }

  await getSessionRepository().revokeAllForUser(targetUserId);

  await writeAudit({
    actor,
    targetUserId,
    action: "admin.user.sessions_revoked",
  });

  return {
    revoked: true,
  };
}
