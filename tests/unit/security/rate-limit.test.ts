import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  clearRateLimit,
  recordRateLimitFailure,
  type RateLimitPolicy,
} from "@/lib/security/rate-limit";

const policy: RateLimitPolicy = {
  limit: 3,
  windowMs: 60_000,
  blockMs: 120_000,
};

describe("rate limit", () => {
  beforeEach(() => {
    clearRateLimit("test:login");
  });

  it("allows traffic under the limit", () => {
    const first = checkRateLimit("test:login", policy, 1_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(3);
  });

  it("blocks after too many failures", () => {
    const now = 5_000;
    recordRateLimitFailure("test:login", policy, now);
    recordRateLimitFailure("test:login", policy, now + 1);
    recordRateLimitFailure("test:login", policy, now + 2);
    const blocked = recordRateLimitFailure("test:login", policy, now + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
