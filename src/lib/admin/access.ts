import { getCurrentUser } from "@/lib/auth/session";
import { getUserRepository } from "@/lib/repositories";
import type { AuthenticatedUser, UserRole } from "@/lib/auth/types";
import {
  canAccessAdminArea,
  canAccessSupportDesk,
  isStaffRole,
  type StaffRole,
} from "@/lib/admin/permissions";

async function resolveActiveUser(): Promise<{
  sessionUser: AuthenticatedUser;
  dbRole: UserRole;
  email: string;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const userId = Number.parseInt(user.id, 10);
  if (!Number.isFinite(userId)) return null;

  const dbUser = await getUserRepository().findById(userId);
  if (!dbUser || dbUser.status !== "active") return null;

  return {
    sessionUser: user,
    dbRole: dbUser.role,
    email: dbUser.email,
  };
}

/**
 * Admin gate: session user + fresh DB role check (M-06).
 * Never trust cookie/JWT role alone for privileged actions.
 */
export async function getAdminAccess() {
  const resolved = await resolveActiveUser();
  if (!resolved) {
    return { granted: false as const, status: 401 as const, user: null };
  }
  if (!canAccessAdminArea(resolved.dbRole)) {
    return {
      granted: false as const,
      status: 403 as const,
      user: resolved.sessionUser,
    };
  }

  return {
    granted: true as const,
    status: 200 as const,
    user: {
      ...resolved.sessionUser,
      role: "admin" as const,
      email: resolved.email,
    },
  };
}

/**
 * Staff gate for Support-Desk (admin or support) with fresh DB role check.
 */
export async function getStaffAccess() {
  const resolved = await resolveActiveUser();
  if (!resolved) {
    return { granted: false as const, status: 401 as const, user: null };
  }
  if (!canAccessSupportDesk(resolved.dbRole) || !isStaffRole(resolved.dbRole)) {
    return {
      granted: false as const,
      status: 403 as const,
      user: resolved.sessionUser,
    };
  }

  return {
    granted: true as const,
    status: 200 as const,
    user: {
      ...resolved.sessionUser,
      role: resolved.dbRole as StaffRole,
      email: resolved.email,
    },
    staffRole: resolved.dbRole as StaffRole,
  };
}

export async function getSupportStaffAccess() {
  return getStaffAccess();
}
