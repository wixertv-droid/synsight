import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockRecord = vi.fn();
const mockHeaders = vi.fn(() => ({ "x-rate-limit": "ok" }));
const mockValidate = vi.fn(() => null);
const mockIp = vi.fn(() => "127.0.0.1");
const mockCreds = vi.fn();

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

vi.mock("@/lib/demo/demo-scan-credentials", () => ({
  resolveDemoScanCredentials: mockCreds,
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
    mockCreds.mockResolvedValue({
      url: "http://contabo.test/api/scan",
      apiKey: "test-key",
    });
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
        body: JSON.stringify({ query: " ", module: "holehe" }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("rejects spiderfoot module", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const res = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: "alice@example.com",
          module: "spiderfoot",
        }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toMatch(/photon/i);
  });

  it("proxies valid module step to upstream", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          findings: [
            {
              source: "holehe",
              platform: "GitHub",
              url: "https://github.com/x",
              risk: "medium",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const { POST } = await import("@/app/api/scan/route");
    const res = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: "alice-unique-proxy-test@example.com",
          module: "holehe",
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(json.exposure_score).toBeGreaterThan(0);
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
        body: JSON.stringify({ query: "alice", module: "maigret" }),
      })
    );
    expect(res.status).toBe(429);
  });
});
