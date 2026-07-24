/**
 * Plain-text cleanup for AI summaries shown in the UI.
 * Keep free of server-only imports so client components can use it.
 */

function stripMarkdownNoise(text: string): string {
  return (
    text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      // Keep markdown links [label](url) intact for SourceLink rendering.
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*/g, "")
      .trim()
  );
}

/** True when the text looks finished enough to show. */
export function isCompleteAiSummary(text: string): boolean {
  const cleaned = text.trim();
  if (cleaned.length < 80) return false;
  if (
    /Management-Zusammenfassung|digitale Spuren|Empfohlene Maßnahmen/i.test(
      cleaned
    ) &&
    cleaned.length >= 160
  ) {
    return true;
  }
  if (!/[.!?…]"?$/.test(cleaned)) return false;
  if (/\(\s*[A-Za-zÄÖÜäöüß]{1,24}$/u.test(cleaned)) return false;
  if (/(?:^|\s)[A-Za-zÄÖÜäöüß-]{1,2}$/u.test(cleaned)) return false;
  return true;
}

/**
 * Clean AI text for display without aggressively shortening it.
 * Preserves markdown links and Sprint-6B section headings.
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
