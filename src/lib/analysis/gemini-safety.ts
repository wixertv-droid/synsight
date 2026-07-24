/**
 * Gemini GenerateContent safety — BLOCK_NONE for OSINT (adult/leak/sensitive facts).
 * REST body uses snake_case category enums as required by Generative Language API.
 */

export type GeminiHarmCategory =
  | "HARM_CATEGORY_SEXUALLY_EXPLICIT"
  | "HARM_CATEGORY_HARASSMENT"
  | "HARM_CATEGORY_HATE_SPEECH"
  | "HARM_CATEGORY_DANGEROUS_CONTENT";

export type GeminiHarmBlockThreshold =
  | "BLOCK_NONE"
  | "BLOCK_ONLY_HIGH"
  | "BLOCK_MEDIUM_AND_ABOVE"
  | "BLOCK_LOW_AND_ABOVE";

export interface GeminiSafetySetting {
  category: GeminiHarmCategory;
  threshold: GeminiHarmBlockThreshold;
}

export const GEMINI_OSINT_SAFETY_SETTINGS: GeminiSafetySetting[] = [
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_NONE",
  },
];

export const GEMINI_SAFETY_FALLBACK_MESSAGE = `## Digitales Kurzprofil

Die KI-Zusammenfassung konnte aufgrund von Sicherheitsfiltern des Sprachmodells nicht erzeugt werden. Die Rohdaten der Suche bleiben unverändert im Report.

## Management-Zusammenfassung

Keine KI-Interpretation verfügbar. Bitte die verifizierten Treffer, Quellen und die Threat-Matrix im Report manuell prüfen.

## Hinweis

finishReason=SAFETY oder blockierte Candidate-Antwort — Inhalte (z. B. Adult-, Leak- oder sensible Quellen) wurden nicht beschönigt, sondern nur nicht textlich zusammengefasst.`;

export function isGeminiSafetyBlock(input: {
  finishReason?: string | null;
  blockReason?: string | null;
  promptBlockReason?: string | null;
}): boolean {
  const reasons = [
    input.finishReason,
    input.blockReason,
    input.promptBlockReason,
  ]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
  return reasons.some(
    (reason) =>
      reason === "SAFETY" ||
      reason.includes("SAFETY") ||
      reason.includes("BLOCKLIST") ||
      reason.includes("PROHIBITED")
  );
}
