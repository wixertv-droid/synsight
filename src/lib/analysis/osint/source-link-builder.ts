import type { IntelligenceHit } from "@/lib/analysis/types";

export interface SourceLink {
  platform: string;
  url: string;
  title: string;
  hitId: string;
  confidence: number;
}

function hostnameLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const known: Record<string, string> = {
      "linkedin.com": "LinkedIn",
      "xing.com": "Xing",
      "facebook.com": "Facebook",
      "instagram.com": "Instagram",
      "twitter.com": "Twitter/X",
      "x.com": "Twitter/X",
      "youtube.com": "YouTube",
      "reddit.com": "Reddit",
      "steamcommunity.com": "Steam",
      "nexusmods.com": "NexusMods",
      "github.com": "GitHub",
    };
    for (const [domain, label] of Object.entries(known)) {
      if (host === domain || host.endsWith(`.${domain}`)) return label;
    }
    return host;
  } catch {
    return "Quelle";
  }
}

/**
 * SourceLinkBuilder — jede Aussage braucht klickbare Originalquellen.
 */
export function buildSourceLinks(hits: IntelligenceHit[]): SourceLink[] {
  const links: SourceLink[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (!hit.url?.startsWith("http")) continue;
    if (
      (hit.identityConfidence ?? 0) < 70 &&
      hit.sourceType !== "identity_profile"
    ) {
      continue;
    }
    const platform = hostnameLabel(hit.url);
    const key = `${platform}|${hit.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      platform,
      url: hit.url,
      title: hit.title,
      hitId: hit.id,
      confidence: hit.identityConfidence ?? 0,
    });
  }
  return links;
}

/** Markdown-ähnliche Inline-Links für das KI-Lagebild (UI parst sie). */
export function formatSourceMarkdown(links: SourceLink[]): string {
  if (links.length === 0) return "Keine bestätigten Quellen.";
  return links
    .map((link) => `- [${link.platform}](${link.url}) — ${link.title}`)
    .join("\n");
}

/**
 * Ersetzt nackte Plattformnamen im Text durch Markdown-Links,
 * wenn eine passende SourceLink existiert (längste Matches zuerst).
 */
export function linkifySummaryText(text: string, links: SourceLink[]): string {
  if (!text || links.length === 0) return text;
  let result = text;
  const sorted = [...links].sort(
    (a, b) => b.platform.length - a.platform.length
  );
  for (const link of sorted) {
    const escaped = link.platform.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const alreadyLinked = new RegExp(
      `\\[${escaped}\\]\\(https?:\\/\\/[^)]+\\)`,
      "i"
    );
    if (alreadyLinked.test(result)) continue;
    const pattern = new RegExp(`(?<![\\w/])(${escaped})(?![\\w\\]])`, "gi");
    result = result.replace(pattern, `[${link.platform}](${link.url})`);
  }
  return result;
}
