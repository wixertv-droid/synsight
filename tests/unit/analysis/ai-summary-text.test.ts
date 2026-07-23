import { describe, expect, it } from "vitest";
import { sanitizeAiSummary } from "@/lib/analysis/ai-summary-text";

describe("sanitizeAiSummary", () => {
  it("strips markdown bold markers", () => {
    expect(
      sanitizeAiSummary("Zur Zielperson **Rene Eule** wurden Treffer gefunden.")
    ).toBe("Zur Zielperson Rene Eule wurden Treffer gefunden.");
  });

  it("cuts incomplete trailing fragments at last sentence", () => {
    const input =
      "Es wurden mehrere Treffer gefunden. Im Rahmen der OSINT-Analyse zur Zielperson Rene Eule (Ris";
    const result = sanitizeAiSummary(input);
    expect(result).toBe("Es wurden mehrere Treffer gefunden.");
    expect(result).not.toMatch(/\(Ris/);
  });
});
