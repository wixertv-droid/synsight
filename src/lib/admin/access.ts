import { getCurrentUser } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import {
  canAccessAdminArea,
  canAccessAdminSection,
  type StaffRole,
} from "@/lib/admin/permissions";
import type { AdminSectionId } from "@/lib/admin/navigation";

export async function getStaffAccess() {
  const user = await getCurrentUser();
  if (!user) {
    return { granted: false as const, status: 401 as const, user: null };
  }
  if (!canAccessAdminArea(user.role)) {
    return { granted: false as const, status: 403 as const, user };
  }
  return {
    granted: true as const,
    status: 200 as const,
    user,
    staffRole: user.role as StaffRole,
  };
}

export async function getAdminAccess() {
  const user = await getCurrentUser();
  if (!user) {
    return { granted: false as const, status: 401 as const, user: null };
  }
  if (user.role !== "admin") {
    return { granted: false as const, status: 403 as const, user };
  }
  return { granted: true as const, status: 200 as const, user };
}

export async function getSupportStaffAccess() {
  return getStaffAccess();
}

export function staffCanAccessSection(
  role: UserRole,
  sectionId: AdminSectionId | "overview"
): boolean {
  return canAccessAdminSection(role, sectionId);
}
