import type { IntelligenceHit } from "@/lib/analysis/types";
import { classifyOsintCategory } from "@/lib/analysis/osint/result-classifier";

function registrableHost(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const parts = host.split(".");
    if (parts.length <= 2) return host;
    // simple eTLD+1 heuristic
    return parts.slice(-2).join(".");
  } catch {
    return url.toLowerCase();
  }
}

export interface AggregatedProfile {
  id: string;
  platform: string;
  host: string;
  category: string;
  url: string;
  title: string;
  pageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  maxConfidence: number;
  hitIds: string[];
  sampleUrls: string[];
}

/**
 * DuplicateResolver + ProfileAggregator —
 * 20 NexusMods-Seiten → 1 Profil mit pageCount.
 */
export function aggregateProfiles(hits: IntelligenceHit[]): {
  aggregatedHits: IntelligenceHit[];
  profiles: AggregatedProfile[];
} {
  const groups = new Map<string, IntelligenceHit[]>();
  const passthrough: IntelligenceHit[] = [];

  for (const hit of hits) {
    if (hit.sourceType === "identity_profile") {
      passthrough.push(hit);
      continue;
    }
    const host = registrableHost(hit.url);
    if (!host) {
      passthrough.push(hit);
      continue;
    }
    const list = groups.get(host) ?? [];
    list.push(hit);
    groups.set(host, list);
  }

  const profiles: AggregatedProfile[] = [];
  const aggregatedHits: IntelligenceHit[] = [...passthrough];

  for (const [host, group] of groups.entries()) {
    const sorted = [...group].sort(
      (a, b) => (b.identityConfidence ?? 0) - (a.identityConfidence ?? 0)
    );
    const primary = sorted[0];
    const times = sorted.map((h) => h.fetchedAt).sort();
    const firstSeenAt = times[0] ?? primary.fetchedAt;
    const lastSeenAt = times[times.length - 1] ?? primary.fetchedAt;
    const maxConfidence = Math.max(
      ...sorted.map((h) => h.identityConfidence ?? 0)
    );
    const category = classifyOsintCategory(primary);
    const platform = primary.source || host;

    const profile: AggregatedProfile = {
      id: `profile-${host}`,
      platform,
      host,
      category,
      url: primary.url,
      title: primary.title,
      pageCount: sorted.length,
      firstSeenAt,
      lastSeenAt,
      maxConfidence,
      hitIds: sorted.map((h) => h.id),
      sampleUrls: sorted.slice(0, 5).map((h) => h.url),
    };
    profiles.push(profile);

    aggregatedHits.push({
      ...primary,
      id: primary.id,
      title:
        sorted.length > 1
          ? `${platform} — ${sorted.length} öffentliche Seiten erkannt`
          : primary.title,
      snippet:
        sorted.length > 1
          ? `${sorted.length} indexierte Seiten auf ${host}. Primärtreffer: ${primary.snippet}`
          : primary.snippet,
      identityConfidence: maxConfidence,
      firstSeenAt,
      lastSeenAt,
      pageCount: sorted.length,
      aggregatedHost: host,
    } as IntelligenceHit & {
      firstSeenAt: string;
      lastSeenAt: string;
      pageCount: number;
      aggregatedHost: string;
    });
  }

  profiles.sort((a, b) => b.maxConfidence - a.maxConfidence);
  return { aggregatedHits, profiles };
}

export function dedupeExactUrls(hits: IntelligenceHit[]): IntelligenceHit[] {
  const seen = new Set<string>();
  const out: IntelligenceHit[] = [];
  for (const hit of hits) {
    let key = hit.url.trim().toLowerCase();
    try {
      const parsed = new URL(hit.url);
      parsed.hash = "";
      key =
        `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "") || "/"}`.toLowerCase();
    } catch {
      /* keep */
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}
