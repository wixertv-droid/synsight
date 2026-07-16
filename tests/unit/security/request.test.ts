import { afterEach, describe, expect, it } from "vitest";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";

const ENV_KEYS = ["APP_URL", "CSRF_STRICT"] as const;

function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  const previous: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    previous[key] = process.env[key];
    if (values[key] === undefined) continue;
    process.env[key] = values[key];
  }
  return () => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  };
}

describe("validateMutationOrigin", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("allows same-origin browser requests", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    expect(validateMutationOrigin(request)).toBeNull();
  });

  it("allows Sec-Fetch-Site same-origin even when upstream Host differs", () => {
    restore = withEnv({
      APP_URL: "http://127.0.0.1:3000",
      CSRF_STRICT: "true",
    });
    // Classic VPS + nginx: Node sees loopback, browser posts from https://synsight.de
    const request = new Request("http://127.0.0.1:3000/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://synsight.de",
        host: "127.0.0.1:3000",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(validateMutationOrigin(request)).toBeNull();
  });

  it("allows https Origin when APP_URL host matches and proto differs", () => {
    restore = withEnv({
      APP_URL: "https://synsight.de",
      CSRF_STRICT: "true",
    });
    const request = new Request("http://127.0.0.1:3000/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://synsight.de",
        host: "127.0.0.1:3000",
      },
    });
    expect(validateMutationOrigin(request)).toBeNull();
  });

  it("allows Origin matching forwarded Host when APP_URL differs", () => {
    restore = withEnv({
      APP_URL: "https://internal.example",
      CSRF_STRICT: "false",
    });
    const request = new Request("http://127.0.0.1:3000/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://synsight.de",
        host: "synsight.de",
        "x-forwarded-proto": "https",
      },
    });
    expect(validateMutationOrigin(request)).toBeNull();
  });

  it("allows forwarded host without x-forwarded-proto via https/http variants", () => {
    restore = withEnv({
      APP_URL: "http://localhost:3000",
      CSRF_STRICT: "true",
    });
    const request = new Request("http://127.0.0.1:3000/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://synsight.de",
        "x-forwarded-host": "synsight.de",
      },
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

  it("rejects cross-site fetch metadata", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(validateMutationOrigin(request)?.status).toBe(403);
  });

  it("rejects missing Origin when CSRF_STRICT is enabled", () => {
    restore = withEnv({ CSRF_STRICT: "true" });
    const request = new Request("https://synsight.de/api/auth/login", {
      method: "POST",
    });
    expect(validateMutationOrigin(request)?.status).toBe(403);
  });

  it("allows missing Origin when CSRF_STRICT is explicitly false", () => {
    restore = withEnv({ CSRF_STRICT: "false" });
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
    });
    expect(validateMutationOrigin(request)).toBeNull();
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
