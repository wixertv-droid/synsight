import type { UserRole } from "@/lib/auth/types";
import type { AdminSectionId } from "@/lib/admin/navigation";

export type StaffRole = Extract<UserRole, "admin" | "support">;

export function isStaffRole(role: UserRole): role is StaffRole {
  return role === "admin" || role === "support";
}

export function canAccessAdminArea(role: UserRole): boolean {
  return isStaffRole(role);
}

export function canAccessAdminSection(
  role: UserRole,
  sectionId: AdminSectionId | "overview"
): boolean {
  if (role === "admin") return true;
  if (role === "support") return sectionId === "support";
  return false;
}

export function canManageUserRoles(role: UserRole): boolean {
  return role === "admin";
}

export function canManageSupportSettings(role: UserRole): boolean {
  return role === "admin";
}
