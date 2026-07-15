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
