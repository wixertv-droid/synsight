import { describe, expect, it } from "vitest";
import { resolveActiveAnalyses } from "@/lib/dashboard/resolve-active-analyses";

describe("resolveActiveAnalyses", () => {
  it("only includes catalog keys and prefers admin label/credits", () => {
    const resolved = resolveActiveAnalyses([
      {
        key: "google_search",
        label: "Google Suche (Admin)",
        description: "Admin-Beschreibung",
        credits: 3,
        sortOrder: 20,
      },
      {
        key: "custom_scan",
        label: "Custom Scan",
        description: "Neu aus Admin",
        credits: 12,
        sortOrder: 10,
      },
    ]);

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.id).toBe("custom_scan");
    expect(resolved[0]?.credits).toBe(12);
    expect(resolved[0]?.tier).toBe("advanced");
    expect(resolved[1]?.title).toBe("Google Suche (Admin)");
    expect(resolved[1]?.description).toBe("Admin-Beschreibung");
    expect(resolved[1]?.credits).toBe(3);
  });

  it("returns empty when admin deactivated everything", () => {
    expect(resolveActiveAnalyses([])).toEqual([]);
  });
});
