import { describe, expect, it } from "vitest";
import {
  canAccessAdminArea,
  canAccessAdminSection,
  canAccessSupportDesk,
  isStaffRole,
} from "@/lib/admin/permissions";

describe("admin/support permissions", () => {
  it("treats admin and support as staff", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("support")).toBe(true);
    expect(isStaffRole("user")).toBe(false);
  });

  it("allows only admins into the admin area", () => {
    expect(canAccessAdminArea("admin")).toBe(true);
    expect(canAccessAdminArea("support")).toBe(false);
    expect(canAccessAdminArea("user")).toBe(false);
  });

  it("allows admin and support into the support desk", () => {
    expect(canAccessSupportDesk("admin")).toBe(true);
    expect(canAccessSupportDesk("support")).toBe(true);
    expect(canAccessSupportDesk("user")).toBe(false);
  });

  it("limits support role to the support section", () => {
    expect(canAccessAdminSection("support", "support")).toBe(true);
    expect(canAccessAdminSection("support", "benutzer")).toBe(false);
    expect(canAccessAdminSection("admin", "finanzen")).toBe(true);
  });
});
