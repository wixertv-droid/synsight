import { afterEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session-token";

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe("session tokens", () => {
  it("creates a verifiable signed token with sid", async () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!";
    const token = await createSessionToken(
      {
        sub: "1",
        sid: "session-abc",
        displayName: "Alex Morgan",
        email: "alex@synsight.de",
        role: "admin",
      },
      3600
    );

    const payload = await verifySessionToken(token);
    expect(payload).toMatchObject({
      sub: "1",
      sid: "session-abc",
      email: "alex@synsight.de",
      role: "admin",
    });
  });

  it("rejects tampered tokens", async () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!";
    const token = await createSessionToken(
      {
        sub: "1",
        sid: "session-abc",
        displayName: "Alex Morgan",
        email: "alex@synsight.de",
        role: "admin",
      },
      3600
    );

    const [body] = token.split(".");
    expect(await verifySessionToken(`${body}.invalidsignature`)).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("not.a.token")).toBeNull();
  });

  it("rejects expired tokens", async () => {
    process.env.SESSION_SECRET = "unit-test-session-secret-32chars!";
    const token = await createSessionToken(
      {
        sub: "1",
        sid: "session-abc",
        displayName: "Alex Morgan",
        email: "alex@synsight.de",
        role: "user",
      },
      -10
    );
    expect(await verifySessionToken(token)).toBeNull();
  });
});
