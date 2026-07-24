import type {
  DigitalExposureFinding,
  DigitalExposureGeminiPayload,
} from "@/lib/analysis/digital-exposure/types";

/**
 * Facts-only payload for a future Gemini cybersecurity summary.
 * Gemini must never invent leaks, rate people, or speculate.
 */
export function buildGeminiPrepPayload(input: {
  subjectName: string;
  riskScore: number;
  findings: DigitalExposureFinding[];
}): DigitalExposureGeminiPayload {
  return {
    mode: "facts_only",
    instructions:
      "Erstelle einen professionellen Cybersecurity-Bericht ausschließlich aus den gelieferten Fakten. Keine neuen Leaks, keine Vermutungen, keine Personenbewertung.",
    subjectName: input.subjectName,
    riskScore: input.riskScore,
    findings: input.findings.map((finding) => ({
      type: finding.type,
      title: finding.title,
      riskLevel: finding.riskLevel,
      sourceName: finding.sourceName,
      sourceDate: finding.sourceDate,
      recommendation: finding.recommendation,
      dataClasses: finding.dataClasses,
    })),
    constraints: [
      "Nur bestätigte API-Treffer verwenden",
      "Keine Passwörter oder Secrets erfinden oder speichern",
      "Keine Spekulation über Identität oder Motivation",
      "Empfehlungen nur aus vorhandenen Finding-Empfehlungen ableiten",
    ],
  };
}

/** Placeholder — KI-Zusammenfassung wird in einem späteren Sprint angebunden. */
export async function summarizeDigitalExposureWithGemini(
  payload: DigitalExposureGeminiPayload
): Promise<string | null> {
  void payload;
  return null;
}
