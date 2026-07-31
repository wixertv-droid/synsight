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
          query: "alice-unique-proxy-test",
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
        body: JSON.stringify({ query: "alice-unique-proxy-test" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("success");
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it("serves cached payload on repeat query without second upstream call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          query: "cache-me@example.com",
          findings: [{ title: "Leak" }],
          exposure_score: 81,
          risk_level: "Kritisch",
          summary: "stable",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    global.fetch = fetchMock;

    const { POST } = await import("@/app/api/scan/route");
    const first = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "cache-me@example.com" }),
      })
    );
    const second = await POST(
      new Request("http://localhost/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "CACHE-ME@example.com" }),
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).exposure_score).toBe(81);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(second.headers.get("x-demo-scan-cache")).toBe("hit");
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
