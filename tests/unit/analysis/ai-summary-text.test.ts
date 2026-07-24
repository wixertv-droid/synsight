import { describe, expect, it } from "vitest";
import {
  isCompleteAiSummary,
  sanitizeAiSummary,
} from "@/lib/analysis/ai-summary-text";

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

  it("preserves Sprint-6B section headings and markdown links", () => {
    const input = [
      "1. Management-Zusammenfassung",
      "Kurzüberblick zur Person.",
      "",
      "3. Bestätigte öffentliche Profile",
      "- [Steam](https://steamcommunity.com/id/demo) — Profil",
    ].join("\n");
    const result = sanitizeAiSummary(input);
    expect(result).toContain("Management-Zusammenfassung");
    expect(result).toContain("[Steam](https://steamcommunity.com/id/demo)");
  });

  it("detects incomplete truncated summaries", () => {
    expect(isCompleteAiSummary("Zu der Person…")).toBe(false);
    expect(
      isCompleteAiSummary(
        "Zu der Person wurden mehrere Treffer gefunden. Das Risiko ist niedrig. Prüfen Sie die kritischen Einträge zuerst."
      )
    ).toBe(true);
  });
});
