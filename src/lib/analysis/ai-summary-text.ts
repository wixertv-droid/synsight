/**
 * Plain-text cleanup for AI summaries shown in the UI.
 * Keep free of server-only imports so client components can use it.
 */

function isBannedHeading(line: string): boolean {
  return /^(?:#{1,6}\s*)?(?:\*\*)?(?:management[-\s]?zusammenfassung|befund|lagebild|einschätzung|empfehlung|fazit|zusammenfassung|executive\s*summary|management\s*summary)(?:\*\*)?\s*:?\s*$/i.test(
    line.trim()
  );
}

function stripMarkdownNoise(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .trim();
}

function stripBannedHeadings(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isBannedHeading(line))
    .join("\n\n")
    .trim();
}

/** True when the text looks like a finished paragraph (ends on sentence punctuation). */
export function isCompleteAiSummary(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < 80) return false;
  if (!/[.!?…]"?$/.test(cleaned)) return false;
  if (/\(\s*[A-Za-zÄÖÜäöüß]{1,24}$/u.test(cleaned)) return false;
  if (/(?:^|\s)[A-Za-zÄÖÜäöüß-]{1,2}$/u.test(cleaned)) return false;
  return true;
}

/**
 * Clean AI text for display without aggressively shortening it.
 * Strips markdown/banned headings; only trims a clearly incomplete last fragment.
 */
export function sanitizeAiSummary(text: string): string {
  let cleaned = stripBannedHeadings(stripMarkdownNoise(text))
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) return cleaned;

  // Inline "Befund:" / "Management-Zusammenfassung:" prefixes
  cleaned = cleaned
    .replace(
      /(?:^|\n)\s*(?:Management[-\s]?Zusammenfassung|Befund|Lagebild|Empfehlung)\s*:\s*/gi,
      "\n\n"
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const endsClean = /[.!?…]"?$/.test(cleaned);
  const endsMidToken =
    /\(\s*[A-Za-zÄÖÜäöüß]{1,20}$/u.test(cleaned) ||
    /(?:^|\s)[A-Za-zÄÖÜäöüß-]{1,2}$/u.test(cleaned) ||
    /Zu der Person…?$/i.test(cleaned) ||
    /,\s*$/.test(cleaned) ||
    /\b(?:der|die|das|und|oder|mit|zu|für|von|bei)\s*$/i.test(cleaned);

  if (!endsClean && endsMidToken) {
    const sentenceBreak = Math.max(
      cleaned.lastIndexOf(". "),
      cleaned.lastIndexOf("! "),
      cleaned.lastIndexOf("? "),
      cleaned.lastIndexOf(".\n"),
      cleaned.lastIndexOf("!\n"),
      cleaned.lastIndexOf("?\n")
    );
    if (sentenceBreak >= 12) {
      cleaned = cleaned.slice(0, sentenceBreak + 1).trim();
    }
  }

  return cleaned;
}
