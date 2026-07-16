import { afterEach, describe, expect, it } from "vitest";
import { getEnvironment, resetEnvironmentCache } from "@/lib/config/env";

describe("environment SMTP soft validation", () => {
  afterEach(() => {
    resetEnvironmentCache();
    delete process.env.EMAIL_DELIVERY_MODE;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    delete process.env.REQUIRE_DATABASE;
    delete process.env.DATABASE_URL;
  });

  it("does not crash getEnvironment when provider mode lacks SMTP keys", () => {
    process.env.REQUIRE_DATABASE = "false";
    delete process.env.DATABASE_URL;
    process.env.EMAIL_DELIVERY_MODE = "provider";
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;

    resetEnvironmentCache();
    const env = getEnvironment();
    expect(env.EMAIL_DELIVERY_MODE).toBe("provider");
    expect(env.SMTP_HOST).toBeUndefined();
  });
});
