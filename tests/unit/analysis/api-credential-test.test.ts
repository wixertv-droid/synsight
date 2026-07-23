import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiCredentialConnection } from "@/lib/services/api-credentials-service";
import { SerpApiProvider } from "@/lib/search/providers/serpapi-provider";

describe("testApiCredentialConnection (Gemini)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reports unsupported providers", async () => {
    const result = await testApiCredentialConnection({
      provider: "virustotal",
      secret: "dummy-key-12345678",
    });
    expect(result.ok).toBe(false);
    expect(result.message).toContain("noch nicht freigeschaltet");
  });
});

describe("SerpApiProvider", () => {
  it("normalizes organic results", () => {
    const provider = new SerpApiProvider("test-key");
    const hits = provider.normalizeResults({
      organic_results: [
        {
          position: 1,
          title: "SynSight",
          link: "https://synsight.de",
          snippet: "Identity Intelligence",
          displayed_link: "synsight.de",
        },
        { title: "", link: "https://invalid.example" },
      ],
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].title).toBe("SynSight");
    expect(hits[0].displayLink).toBe("synsight.de");
  });

  it("healthCheck succeeds on valid SerpAPI response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          search_metadata: { status: "Success", total_time_taken: 0.4 },
          organic_results: [
            {
              title: "OpenAI",
              link: "https://openai.com",
              snippet: "AI",
              displayed_link: "openai.com",
            },
          ],
        }),
      }))
    );

    const provider = new SerpApiProvider("test-key");
    const health = await provider.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.googleSearchOnline).toBe(true);
    expect(health.message).toContain("erfolgreich");
  });

  it("healthCheck maps invalid key errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Invalid API key." }),
      }))
    );
    const provider = new SerpApiProvider("bad-key");
    const health = await provider.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.message).toBe("Ungültiger API-Key");
  });
});
