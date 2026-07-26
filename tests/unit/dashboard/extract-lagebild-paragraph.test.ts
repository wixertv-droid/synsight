import { describe, expect, it } from "vitest";
import { extractLagebildFirstParagraph } from "@/lib/dashboard/extract-lagebild-paragraph";

describe("extractLagebildFirstParagraph", () => {
  it("returns the first Lagebild paragraph", () => {
    const text = `1. Lagebild

Die digitale Identität zeigt mehrere öffentliche Profile und ein erhöhtes Leak-Risiko.

2. Kritische Punkte
- Punkt A`;
    expect(extractLagebildFirstParagraph(text)).toContain("digitale Identität");
    expect(extractLagebildFirstParagraph(text)).not.toContain("Punkt A");
  });

  it("ignores generating placeholder", () => {
    expect(extractLagebildFirstParagraph("Lagebild wird erstellt…")).toBe("");
  });
});
