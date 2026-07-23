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
    .trim();
}

/**
 * Drop incomplete trailing fragments (e.g. cut mid-word by token limit).
 */
export function sanitizeAiSummary(text: string): string {
  let cleaned = stripMarkdownNoise(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return cleaned;

  const looksTruncated =
    !/[.!?…]"?$/.test(cleaned) ||
    /\(\s*[A-Za-zÄÖÜäöüß]{1,12}$/.test(cleaned) ||
    /\b[A-Za-zÄÖÜäöüß]{1,3}$/.test(cleaned);

  if (looksTruncated) {
    const lastBreak = Math.max(
      cleaned.lastIndexOf(". "),
      cleaned.lastIndexOf("! "),
      cleaned.lastIndexOf("? "),
      cleaned.lastIndexOf(".\n"),
      cleaned.lastIndexOf("!\n"),
      cleaned.lastIndexOf("?\n")
    );
    if (lastBreak >= 20) {
      cleaned = cleaned.slice(0, lastBreak + 1).trim();
    } else {
      cleaned = `${cleaned.replace(/[\s(]+[A-Za-zÄÖÜäöüß-]{0,20}$/, "").trim()}…`;
    }
  }

  return cleaned;
}
