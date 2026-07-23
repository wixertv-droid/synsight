import { beforeEach, describe, expect, it, vi } from "vitest";
import { testApiCredentialConnection } from "@/lib/services/api-credentials-service";

describe("testApiCredentialConnection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("probes Google Custom Search with draft credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ items: [{ title: "A" }, { title: "B" }] }),
      }))
    );

    const result = await testApiCredentialConnection({
      provider: "google_custom_search",
      secret: "test-api-key-123456",
      engineId: "0728bba0e53574410",
    });

    expect(result.ok).toBe(true);
    expect(result.hitCount).toBe(2);
    expect(result.message).toContain("Verbindung aktiv");
    expect(fetch).toHaveBeenCalled();
  });

  it("fails clearly when Google credentials are missing", async () => {
    const result = await testApiCredentialConnection({
      provider: "google_custom_search",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/API-Key|Engine-ID/i);
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
