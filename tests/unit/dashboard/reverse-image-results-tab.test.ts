import { describe, expect, it } from "vitest";

/** Mirrors ResultsCenter.normalizeResultsTabId */
function normalizeResultsTabId(id: string): string {
  if (id === "reverse_image_discovery") return "reverse_image_search";
  return id;
}

describe("results tab id for reverse image", () => {
  it("maps billing key reverse_image_discovery to stable results tab", () => {
    expect(normalizeResultsTabId("reverse_image_discovery")).toBe(
      "reverse_image_search"
    );
    expect(normalizeResultsTabId("reverse_image_search")).toBe(
      "reverse_image_search"
    );
    expect(normalizeResultsTabId("google_search")).toBe("google_search");
  });
});
