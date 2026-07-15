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
  registerUser,
} from "@/lib/services/auth-service";
import { verifyEmailToken } from "@/lib/services/verification-service";
import { completeOnboarding } from "@/lib/services/onboarding-service";
import { getProfileRepository } from "@/lib/repositories";
import { isOnboardingComplete } from "@/lib/repositories/profile-repository";

describe("onboarding completion", () => {
  beforeEach(() => {
    resetInMemoryStores();
    cookieStore.value = null;
    delete process.env.DATABASE_URL;
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!";
    process.env.APP_URL = "http://localhost:3000";
    process.env.EMAIL_DELIVERY_MODE = "disabled";
  });

  it("marks onboarding complete so the next login can enter the dashboard", async () => {
    const registration = await registerUser({
      firstName: "Nora",
      lastName: "Pilot",
      email: "nora.pilot@example.com",
      password: "SecurePass1!",
      passwordConfirm: "SecurePass1!",
      monitoringOptIn: true,
    });
    expect(registration.status).toBe("created");
    if (registration.status !== "created") return;

    await verifyEmailToken(registration.verificationToken);

    const { getUserRepository } = await import("@/lib/repositories");
    const user = await getUserRepository().findByEmail(
      "nora.pilot@example.com"
    );
    expect(user).toBeTruthy();
    const userId = user!.id;

    const profileAfterRegister =
      await getProfileRepository().findByUserId(userId);
    expect(profileAfterRegister).toBeTruthy();
    expect(isOnboardingComplete(profileAfterRegister)).toBe(false);

    await completeOnboarding(userId, {
      identity: {
        firstName: "Nora",
        lastName: "Pilot",
        publicAlias: "nona",
        formerNames: [],
        nicknames: [],
        city: "Berlin",
        country: "DE",
        phoneNumbers: [],
        additionalEmails: [],
      },
      digitalIdentity: { socialAccounts: [] },
      additionalData: {
        oldUsernames: ["oldnora"],
        gamingNames: [],
        websites: ["https://example.com"],
        domains: ["example.com"],
        companies: ["SynSight Labs"],
        publicProfiles: ["https://about.me/nora"],
      },
      imageProfile: { images: [] },
    });

    const completed = await getProfileRepository().findByUserId(userId);
    expect(isOnboardingComplete(completed)).toBe(true);
    expect(completed?.onboardingStep).toBe(4);

    const login = await loginWithCredentials(
      "nora.pilot@example.com",
      "SecurePass1!"
    );
    expect(login.status).toBe("success");
  });
});
