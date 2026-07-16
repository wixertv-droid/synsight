import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";
import { DEV_AUTH_PASSWORD, DEV_AUTH_USERNAME } from "@/lib/auth/config";

const cookieStore = {
  value: null as string | null,
  set: vi.fn((name: string, value: string) => {
    if (name === "synsight_session") {
      cookieStore.value = value || null;
    }
  }),
  get: vi.fn((name: string) => {
    if (name === "synsight_session" && cookieStore.value) {
      return { name, value: cookieStore.value };
    }
    return undefined;
  }),
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { registerUser } from "@/lib/services/auth-service";

function loginRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
) {
  return new Request("https://synsight.de/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://synsight.de",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    resetInMemoryStores();
    cookieStore.value = null;
    cookieStore.set.mockClear();
    delete process.env.DATABASE_URL;
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!";
    process.env.APP_URL = "https://synsight.de";
    process.env.AUTO_VERIFY_EMAIL = "true";
    process.env.CSRF_STRICT = "true";
  });

  it("logs in the seeded admin and sets a session cookie", async () => {
    const response = await loginPost(
      loginRequest({
        identifier: DEV_AUTH_USERNAME,
        password: DEV_AUTH_PASSWORD,
      })
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.redirectTo).toBe("/dashboard");
    expect(cookieStore.value).toBeTruthy();
  });

  it("rejects wrong password", async () => {
    const response = await loginPost(
      loginRequest({
        identifier: DEV_AUTH_USERNAME,
        password: "definitely-wrong",
      })
    );
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it("rejects unknown users", async () => {
    const response = await loginPost(
      loginRequest({
        identifier: "nobody@example.com",
        password: "SecurePass1!",
      })
    );
    expect(response.status).toBe(401);
  });

  it("allows login behind reverse-proxy loopback Host via same-origin", async () => {
    const request = new Request("http://127.0.0.1:3000/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://synsight.de",
        host: "127.0.0.1:3000",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify({
        identifier: "admin@synsight.local",
        password: "admin",
      }),
    });
    const response = await loginPost(request);
    expect(response.status).toBe(200);
  });

  it("rejects cross-site CSRF attempts", async () => {
    const response = await loginPost(
      loginRequest(
        { identifier: "admin", password: "admin" },
        { "sec-fetch-site": "cross-site", origin: "https://evil.example" }
      )
    );
    expect(response.status).toBe(403);
  });

  it("logs in a freshly registered auto-verified user", async () => {
    const email = "route.user@example.com";
    await registerUser({
      firstName: "Route",
      lastName: "User",
      email,
      password: "SecurePass1!",
      passwordConfirm: "SecurePass1!",
      monitoringOptIn: false,
    });

    const response = await loginPost(
      loginRequest({ identifier: email, password: "SecurePass1!" })
    );
    expect(response.status).toBe(200);
  });

  it("logout clears the session cookie", async () => {
    await loginPost(
      loginRequest({
        identifier: DEV_AUTH_USERNAME,
        password: DEV_AUTH_PASSWORD,
      })
    );
    expect(cookieStore.value).toBeTruthy();

    const logoutResponse = await logoutPost(
      new Request("https://synsight.de/api/auth/logout", {
        method: "POST",
        headers: {
          origin: "https://synsight.de",
          "sec-fetch-site": "same-origin",
        },
      })
    );
    expect(logoutResponse.status).toBe(200);
    expect(cookieStore.value).toBeNull();
  });
});
