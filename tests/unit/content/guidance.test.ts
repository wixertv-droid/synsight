import { describe, expect, it } from "vitest";
import { getAnalysisGuidance, guidance } from "@/lib/content/guidance";

describe("guidance content", () => {
  it("provides landing and dashboard explanations", () => {
    expect(guidance.landing.digitalTraces).toContain("Digitale Spuren");
    expect(guidance.dashboard.securityStatus).toContain("Sicherheitsstatus");
    expect(guidance.landing.syncredits).toContain("SynCredits");
  });

  it("returns analysis-specific guidance with fallback", () => {
    const person = getAnalysisGuidance("person_search");
    expect(person.what).toContain("öffentliche Informationen");
    expect(getAnalysisGuidance("unknown_key").what).toBeTruthy();
  });

  it("uses friendly empty-state copy", () => {
    expect(guidance.empty.transactions).toContain("Analyse");
    expect(guidance.empty.promotions).toContain("Promotion");
  });
});
