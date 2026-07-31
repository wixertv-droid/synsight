import { describe, expect, it } from "vitest";
import { getDemoScanCache, setDemoScanCache } from "@/lib/demo/scan-cache";

describe("demo scan cache", () => {
  it("returns the same payload for the same query (case-insensitive)", () => {
    const payload = {
      status: "success",
      exposure_score: 81,
      query: "Rene@Example.com",
    };
    setDemoScanCache("Rene@Example.com", payload);
    expect(getDemoScanCache("rene@example.com")).toEqual(payload);
    expect(getDemoScanCache("RENE@EXAMPLE.COM")).toEqual(payload);
  });

  it("keeps different queries isolated", () => {
    setDemoScanCache("a@x.de", { exposure_score: 70 });
    setDemoScanCache("b@x.de", { exposure_score: 90 });
    expect(
      (getDemoScanCache("a@x.de") as { exposure_score: number }).exposure_score
    ).toBe(70);
    expect(
      (getDemoScanCache("b@x.de") as { exposure_score: number }).exposure_score
    ).toBe(90);
  });
});
