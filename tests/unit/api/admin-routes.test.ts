import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import { getUserRepository } from "@/lib/repositories";

const { accessState } = vi.hoisted(() => ({
  accessState: {
    role: "admin" as "admin" | "user",
    authenticated: true,
  },
}));

vi.mock("@/lib/admin/access", () => ({
  getAdminAccess: async () => {
    if (!accessState.authenticated) {
      return { granted: false, status: 401, user: null };
    }
    const user = {
      id: "1",
      displayName: "Test Actor",
      email: "actor@example.com",
      role: accessState.role,
    };
    return accessState.role === "admin"
      ? { granted: true, status: 200, user }
      : { granted: false, status: 403, user };
  },
}));

import { GET as usersGet } from "@/app/api/admin/users/route";
import { POST as creditsAddPost } from "@/app/api/admin/credits/add/route";
import {
  GET as pricingGet,
  PUT as pricingPut,
} from "@/app/api/admin/pricing/route";

describe("admin API role guards", () => {
  beforeEach(async () => {
    resetInMemoryStores();
    delete process.env.DATABASE_URL;
    accessState.authenticated = true;
    accessState.role = "admin";
    const repository = getUserRepository();
    const target = await repository.create({
      email: "api.target@example.com",
      username: "apitarget",
      passwordHash: "hash",
      firstName: "API",
      lastName: "Target",
    });
    await repository.activate(target.id);
  });

  it("returns 401 for unauthenticated requests", async () => {
    accessState.authenticated = false;
    const response = await usersGet(
      new Request("https://synsight.de/api/admin/users")
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for authenticated non-admin users", async () => {
    accessState.role = "user";
    const response = await usersGet(
      new Request("https://synsight.de/api/admin/users")
    );
    expect(response.status).toBe(403);
  });

  it("allows admin user search", async () => {
    const response = await usersGet(
      new Request("https://synsight.de/api/admin/users?q=api.target")
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.users).toHaveLength(1);
  });

  it("allows admin credit grants with CSRF protection", async () => {
    const response = await creditsAddPost(
      new Request("https://synsight.de/api/admin/credits/add", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://synsight.de",
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({
          userId: 2,
          amount: 120,
          reason: "API Testgutschrift",
          confirm: true,
        }),
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      balance: 120,
      performedBy: 1,
    });
  });

  it("forbids pricing access for normal users", async () => {
    accessState.role = "user";
    const response = await pricingGet();
    expect(response.status).toBe(403);
  });

  it("updates analysis pricing through the admin API", async () => {
    const response = await pricingPut(
      new Request("https://synsight.de/api/admin/pricing", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin: "https://synsight.de",
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify({
          action: "upsert",
          analysisKey: "domain_analysis",
          label: "Domain Analyse",
          description: "Admin API Test",
          credits: 12,
          sortOrder: 50,
          isActive: true,
        }),
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.analysis.credits).toBe(12);
  });
});
