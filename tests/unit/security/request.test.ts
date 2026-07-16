import { describe, expect, it } from "vitest";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

describe("validateMutationOrigin", () => {
  it("allows same-origin browser requests", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    expect(validateMutationOrigin(request)).toBeNull();
  });

  it("rejects cross-origin mutations", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    const response = validateMutationOrigin(request);
    expect(response?.status).toBe(403);
  });

  it("rejects cross-site fetch metadata without Origin", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(validateMutationOrigin(request)?.status).toBe(403);
  });

  it("rejects missing Origin when CSRF_STRICT is enabled", () => {
    const previous = process.env.CSRF_STRICT;
    process.env.CSRF_STRICT = "true";
    const request = new Request("https://synsight.de/api/auth/login", {
      method: "POST",
    });
    expect(validateMutationOrigin(request)?.status).toBe(403);
    if (previous === undefined) delete process.env.CSRF_STRICT;
    else process.env.CSRF_STRICT = previous;
  });

  it("allows Origin matching forwarded Host when APP_URL differs", () => {
    const previousApp = process.env.APP_URL;
    const previousStrict = process.env.CSRF_STRICT;
    process.env.APP_URL = "https://internal.example";
    process.env.CSRF_STRICT = "false";
    const request = new Request("http://127.0.0.1:3000/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://synsight.de",
        host: "synsight.de",
        "x-forwarded-proto": "https",
      },
    });
    expect(validateMutationOrigin(request)).toBeNull();
    if (previousApp === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousApp;
    if (previousStrict === undefined) delete process.env.CSRF_STRICT;
    else process.env.CSRF_STRICT = previousStrict;
  });
});

describe("getClientIp", () => {
  it("prefers the first forwarded address", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      },
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });
});
