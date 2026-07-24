import { describe, expect, it } from "vitest";
import {
  maskEmail,
  maskPhone,
  stripHtml,
} from "@/lib/analysis/digital-exposure/mask";
import { buildGeminiPrepPayload } from "@/lib/analysis/digital-exposure/gemini-prep";
import type { DigitalExposureFinding } from "@/lib/analysis/digital-exposure/types";

describe("digital exposure helpers", () => {
  it("masks email and phone without leaking full identifiers", () => {
    expect(maskEmail("max.mustermann@example.de")).toMatch(
      /^ma\*+@example\.de$/
    );
    expect(maskPhone("+4917612345678")).toContain("*");
    expect(maskPhone("+4917612345678")).not.toContain("123456");
  });

  it("strips HTML from breach descriptions", () => {
    expect(stripHtml("<p>Adobe <em>Leak</em></p>")).toBe("Adobe Leak");
  });

  it("builds facts-only Gemini payload without inventing data", () => {
    const findings: DigitalExposureFinding[] = [
      {
        type: "BREACH",
        title: "Adobe",
        description: "Verified breach",
        riskLevel: "high",
        sourceName: "Adobe",
        sourceDate: "2013-10-04",
        recommendation: "Passwort ändern",
        sourceUrl: "https://haveibeenpwned.com/",
        identifierMasked: "ma***@example.de",
        dataClasses: ["Email addresses", "Passwords"],
      },
    ];
    const payload = buildGeminiPrepPayload({
      subjectName: "Max Mustermann",
      riskScore: 42,
      findings,
    });
    expect(payload.mode).toBe("facts_only");
    expect(payload.findings).toHaveLength(1);
    expect(payload.instructions).toMatch(/Keine neuen Leaks/i);
    expect(payload.constraints.join(" ")).toMatch(/bestätigte API-Treffer/i);
    expect(JSON.stringify(payload)).not.toMatch(/password123|geheim/i);
  });
});
