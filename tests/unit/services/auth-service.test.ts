import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetInMemoryStores } from "../../helpers/memory-reset";

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

import {
  loginWithCredentials,
  logout,
  registerUser,
} from "@/lib/services/auth-service";
import { verifyEmailToken } from "@/lib/services/verification-service";
import { getUserRepository } from "@/lib/repositories";
import { DEV_AUTH_PASSWORD, DEV_AUTH_USERNAME } from "@/lib/auth/config";

describe("auth-service", () => {
  beforeEach(() => {
    resetInMemoryStores();
    cookieStore.value = null;
    cookieStore.set.mockClear();
    cookieStore.get.mockClear();
    delete process.env.DATABASE_URL;
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!";
  });

  it("registers a pending user and issues a verification token", async () => {
    const result = await registerUser({
      firstName: "Alex",
      lastName: "Morgan",
      email: "new.user@example.com",
      password: "SecurePass1!",
      passwordConfirm: "SecurePass1!",
      monitoringOptIn: false,
    });

    expect(result.status).toBe("created");
    if (result.status !== "created") return;

    const user = await getUserRepository().findByEmail("new.user@example.com");
    expect(user?.status).toBe("pending_verification");
    expect(result.verificationToken.length).toBeGreaterThan(20);

    const verified = await verifyEmailToken(result.verificationToken);
    expect(verified.success).toBe(true);
    const activated = await getUserRepository().findByEmail(
      "new.user@example.com"
    );
    expect(activated?.status).toBe("active");
  });

  it("rejects duplicate email registration", async () => {
    const payload = {
      firstName: "Alex",
      lastName: "Morgan",
      email: "dup@example.com",
      password: "SecurePass1!",
      passwordConfirm: "SecurePass1!",
      monitoringOptIn: false,
    };
    await registerUser(payload);
    const second = await registerUser(payload);
    expect(second.status).toBe("email_exists");
  });

  it("logs in the seeded admin and creates a session cookie", async () => {
    const result = await loginWithCredentials(
      DEV_AUTH_USERNAME,
      DEV_AUTH_PASSWORD
    );
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.user.email).toContain("@");
    }
    expect(cookieStore.set).toHaveBeenCalled();
    expect(cookieStore.value).toBeTruthy();
  });

  it("rejects invalid credentials and locks after repeated failures", async () => {
    for (let i = 0; i < 4; i += 1) {
      const result = await loginWithCredentials(DEV_AUTH_USERNAME, "wrong");
      expect(result.status).toBe("invalid");
    }
    const locked = await loginWithCredentials(DEV_AUTH_USERNAME, "wrong");
    expect(locked.status).toBe("locked");
  });

  it("requires email verification before login", async () => {
    const registration = await registerUser({
      firstName: "Pending",
      lastName: "User",
      email: "pending@example.com",
      password: "SecurePass1!",
      passwordConfirm: "SecurePass1!",
      monitoringOptIn: false,
    });
    expect(registration.status).toBe("created");

    const login = await loginWithCredentials(
      "pending@example.com",
      "SecurePass1!"
    );
    expect(login.status).toBe("verification_required");
  });

  it("clears the session on logout", async () => {
    await loginWithCredentials(DEV_AUTH_USERNAME, DEV_AUTH_PASSWORD);
    expect(cookieStore.value).toBeTruthy();
    await logout();
    expect(cookieStore.value).toBeNull();
  });
});
