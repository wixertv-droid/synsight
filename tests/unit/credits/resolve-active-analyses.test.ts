import { describe, expect, it } from "vitest";
import {
  extractActiveAnalysisKeys,
  isAnalysisKeyActive,
} from "@/lib/credits/resolve-active-analyses";

describe("credits resolve-active-analyses", () => {
  it("extractActiveAnalysisKeys drops replaced legacy keys", () => {
    expect(
      extractActiveAnalysisKeys([
        { key: "google_search" },
        { key: "phone_analysis" },
        { key: "digital_leak_exposure" },
      ])
    ).toEqual(["google_search", "digital_leak_exposure"]);
  });

  it("isAnalysisKeyActive is fail-closed without activeKeys", () => {
    expect(isAnalysisKeyActive(undefined, "google_search")).toBe(false);
    expect(isAnalysisKeyActive([], "google_search")).toBe(false);
  });

  it("isAnalysisKeyActive rejects replaced keys even if listed", () => {
    expect(
      isAnalysisKeyActive(["alias_analysis", "google_search"], "alias_analysis")
    ).toBe(false);
    expect(
      isAnalysisKeyActive(["alias_analysis", "google_search"], "google_search")
    ).toBe(true);
  });
});
