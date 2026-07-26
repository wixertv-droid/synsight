/**
 * Extract the first paragraph of section "1. Lagebild" from a threats KI summary.
 */
export function extractLagebildFirstParagraph(
  text: string | null | undefined
): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed || trimmed === "Lagebild wird erstellt…") return "";

  const section = trimmed.match(
    /(?:^|\n)\s*(?:#{1,3}\s*)?(?:1\.\s*)?Lagebild\b[^\n]*\n+([\s\S]*?)(?=\n\s*(?:#{1,3}\s*)?(?:2\.\s*)?(?:Kritische Punkte|Sofortmaßnahmen|Offene Risiken)\b|$)/i
  );
  const block = (section?.[1] ?? trimmed).trim();
  // Prefer blank-line paragraph; else first 2–3 sentences / ~420 chars
  const byBlank = block
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)[0];
  const paragraph = (byBlank ?? block).replace(/\s+/g, " ").trim();
  if (paragraph.length <= 420) return paragraph;
  const cut = paragraph.slice(0, 420);
  const lastStop = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? ")
  );
  return lastStop > 120 ? cut.slice(0, lastStop + 1) : `${cut.trim()}…`;
}
