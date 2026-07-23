import { describe, expect, it } from "vitest";
import { sanitizeAiSummary } from "@/lib/analysis/ai-summary-text";

describe("sanitizeAiSummary", () => {
  it("strips markdown bold markers but keeps full text", () => {
    const input =
      "Zur Zielperson **Rene Eule** wurden mehrere Treffer gefunden. Das Risiko ist mittel.";
    expect(sanitizeAiSummary(input)).toBe(
      "Zur Zielperson Rene Eule wurden mehrere Treffer gefunden. Das Risiko ist mittel."
    );
  });

  it("preserves long multi-paragraph summaries", () => {
    const input = [
      "Zu Rene Eule wurden 50 öffentliche Treffer geprüft.",
      "",
      "Davon wirken 11 sehr wahrscheinlich personenbezogen. Besonders Social-Media und Webseiten sind auffällig.",
      "",
      "Prüfen Sie zuerst die kritischen Treffer und entfernen Sie sichtbare Kontaktdaten.",
    ].join("\n");
    const result = sanitizeAiSummary(input);
    expect(result.length).toBeGreaterThan(120);
    expect(result).toContain("50 öffentliche Treffer");
    expect(result).toContain("kritischen Treffer");
  });

  it("trims only a clearly incomplete trailing fragment", () => {
    const input =
      "Es wurden mehrere Treffer gefunden. Im Rahmen der Analyse zur Zielperson Rene Eule (Ris";
    const result = sanitizeAiSummary(input);
    expect(result).toBe("Es wurden mehrere Treffer gefunden.");
    expect(result).not.toMatch(/\(Ris/);
  });
});
