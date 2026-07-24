import { describe, expect, it } from "vitest";
import {
  GEMINI_OSINT_SAFETY_SETTINGS,
  GEMINI_SAFETY_FALLBACK_MESSAGE,
  isGeminiSafetyBlock,
} from "@/lib/analysis/gemini-safety";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("Gemini OSINT safety", () => {
  it("defines BLOCK_NONE for all four harm categories", () => {
    const categories = GEMINI_OSINT_SAFETY_SETTINGS.map((s) => s.category);
    expect(categories).toEqual([
      "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      "HARM_CATEGORY_HARASSMENT",
      "HARM_CATEGORY_HATE_SPEECH",
      "HARM_CATEGORY_DANGEROUS_CONTENT",
    ]);
    expect(
      GEMINI_OSINT_SAFETY_SETTINGS.every((s) => s.threshold === "BLOCK_NONE")
    ).toBe(true);
  });

  it("detects SAFETY finishReason and prompt blocks", () => {
    expect(isGeminiSafetyBlock({ finishReason: "SAFETY" })).toBe(true);
    expect(
      isGeminiSafetyBlock({
        promptBlockReason: "SAFETY",
        blockReason: "SAFETY",
      })
    ).toBe(true);
    expect(isGeminiSafetyBlock({ finishReason: "STOP" })).toBe(false);
  });

  it("wires safetySettings into gemini-summary request body", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/analysis/gemini-summary.ts"),
      "utf8"
    );
    expect(source).toContain("safetySettings: GEMINI_OSINT_SAFETY_SETTINGS");
    expect(source).toContain("GEMINI_SAFETY_FALLBACK_MESSAGE");
    expect(source).toContain("summarize_safety_fallback");
  });

  it("exposes a readable safety fallback message", () => {
    expect(GEMINI_SAFETY_FALLBACK_MESSAGE).toContain("Digitales Kurzprofil");
    expect(GEMINI_SAFETY_FALLBACK_MESSAGE).toContain("SAFETY");
  });
});
