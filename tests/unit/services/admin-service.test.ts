import { beforeEach, describe, expect, it } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import { getUserRepository } from "@/lib/repositories";
import {
  adjustCreditsByAdmin,
  AdminForbiddenError,
  getAdminUserDetail,
  searchAdminUsers,
} from "@/lib/services/admin-service";
import type { AuthenticatedUser } from "@/lib/auth/types";

const admin: AuthenticatedUser = {
  id: "1",
  displayName: "Admin User",
  email: "admin@synsight.local",
  role: "admin",
};

const normalUser: AuthenticatedUser = {
  id: "2",
  displayName: "Normal User",
  email: "normal@example.com",
  role: "user",
};

describe("admin-service", () => {
  beforeEach(async () => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    const repository = getUserRepository();
    const target = await repository.create({
      email: "target@example.com",
      username: "target",
      passwordHash: "argon-hash",
      firstName: "Target",
      lastName: "Person",
    });
    await repository.activate(target.id);
  });

  it("forbids non-admin user search", async () => {
    await expect(searchAdminUsers(normalUser, "target")).rejects.toBeInstanceOf(
      AdminForbiddenError
    );
  });

  it("searches users by name, email and id for admins", async () => {
    expect(await searchAdminUsers(admin, "target")).toHaveLength(1);
    expect(await searchAdminUsers(admin, "target@example.com")).toHaveLength(1);
    expect(await searchAdminUsers(admin, "2")).toHaveLength(1);
  });

  it("grants and removes credits with complete audit metadata", async () => {
    const granted = await adjustCreditsByAdmin({
      actor: admin,
      targetUserId: 2,
      amount: 200,
      reason: "Support-Gutschrift",
      operation: "add",
      ipAddress: "203.0.113.7",
    });
    expect(granted.status).toBe("completed");
    if (granted.status !== "completed") return;
    expect(granted.balance).toBe(200);
    expect(granted.performedBy).toBe(1);

    const removed = await adjustCreditsByAdmin({
      actor: admin,
      targetUserId: 2,
      amount: 50,
      reason: "Korrektur",
      operation: "remove",
    });
    expect(removed.status).toBe("completed");
    if (removed.status !== "completed") return;
    expect(removed.balance).toBe(150);

    const detail = await getAdminUserDetail(admin, 2);
    expect(detail?.transactions[0]).toMatchObject({
      type: "admin_revoke",
      performedBy: 1,
      reason: "Korrektur",
      transactionSource: "admin_remove",
    });
    expect(detail?.transactions[1]).toMatchObject({
      type: "admin_grant",
      performedBy: 1,
      reason: "Support-Gutschrift",
      transactionSource: "admin_credit",
    });
  });

  it("prevents removal below zero balance", async () => {
    const result = await adjustCreditsByAdmin({
      actor: admin,
      targetUserId: 2,
      amount: 10,
      reason: "Nicht möglich",
      operation: "remove",
    });
    expect(result).toEqual({ status: "insufficient", balance: 0 });
  });
});
