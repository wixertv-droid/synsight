import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockRecord = vi.fn();
const mockHeaders = vi.fn(() => ({ "x-rate-limit": "ok" }));
const mockValidate = vi.fn(() => null);
const mockIp = vi.fn(() => "127.0.0.1");

vi.mock("@/lib/security/rate-limit", () => ({
  COMMUNICATION_RATE_LIMIT: {
    limit: 5,
    windowMs: 60_000,
    blockMs: 60_000,
  },
  recordRateLimitAttempt: mockRecord,
  rateLimitHeaders: mockHeaders,
}));

vi.mock("@/lib/security/request", () => ({
  getClientIp: mockIp,
  validateMutationOrigin: mockValidate,
}));

describe("POST /api/scan", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockRecord.mockReturnValue({
      allowed: true,
      remaining: 7,
      retryAfterSeconds: 0,
    });
    mockValidate.mockReturnValue(null);
    mockIp.mockReturnValue("127.0.0.1");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("rejects empty query", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const res = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: " " }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("proxies valid query to upstream", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          query: "alice",
          findings: [],
          exposure_score: 12,
          risk_level: "Niedrig",
          summary: "ok",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const { POST } = await import("@/app/api/scan/route");
    const res = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "alice" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it("rate-limits excessive scans", async () => {
    mockRecord.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
    });
    const { POST } = await import("@/app/api/scan/route");
    const res = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "alice" }),
      })
    );
    expect(res.status).toBe(429);
  });
});
