/**
 * Plain-text cleanup for AI summaries shown in the UI.
 * Keep free of server-only imports so client components can use it.
 */

function stripMarkdownNoise(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * Clean AI text for display without aggressively shortening it.
 * Only strips markdown and trims a clearly incomplete last fragment.
 */
export function sanitizeAiSummary(text: string): string {
  let cleaned = stripMarkdownNoise(text)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned) return cleaned;

  const endsClean = /[.!?…]"?$/.test(cleaned);
  const endsMidToken =
    /\(\s*[A-Za-zÄÖÜäöüß]{1,20}$/.test(cleaned) ||
    /(?:^|\s)[A-Za-zÄÖÜäöüß-]{1,2}$/.test(cleaned);

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
    } else {
      cleaned = `${cleaned
        .replace(/[\s(]+[A-Za-zÄÖÜäöüß-]{0,24}$/u, "")
        .trim()}…`;
    }
  }

  return cleaned;
}
