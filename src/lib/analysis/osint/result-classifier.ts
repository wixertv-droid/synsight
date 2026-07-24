import { getCategoryMeta } from "@/lib/analysis/hit-intel";
import type { IntelligenceHit } from "@/lib/analysis/types";

export type OsintDisplayCategory =
  | "public_profile"
  | "forum"
  | "company"
  | "image"
  | "document"
  | "press"
  | "authority"
  | "video"
  | "website"
  | "other";

export const OSINT_CATEGORY_LABELS: Record<OsintDisplayCategory, string> = {
  public_profile: "Öffentliche Profile",
  forum: "Foren",
  company: "Unternehmen",
  image: "Bilder",
  document: "Dokumente",
  press: "Presse",
  authority: "Behörden",
  video: "Videos",
  website: "Sonstige Webseiten",
  other: "Sonstige",
};

/**
 * GoogleResultClassifier — gruppiert Treffer in OSINT-Kategorien.
 */
export function classifyOsintCategory(
  hit: Pick<IntelligenceHit, "category" | "url" | "title" | "snippet">
): OsintDisplayCategory {
  const blob = `${hit.url} ${hit.title} ${hit.snippet}`.toLowerCase();
  const meta = getCategoryMeta(hit.category, hit.url, hit.title);

  if (
    meta.filterKey === "image" ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(hit.url)
  ) {
    return "image";
  }
  if (
    meta.filterKey === "document" ||
    /\.(pdf|docx?|xlsx?)(\?|$)/i.test(hit.url)
  ) {
    return "document";
  }
  if (
    meta.filterKey === "forum" ||
    /forum|reddit|board|community|discord/.test(blob)
  ) {
    return "forum";
  }
  if (
    meta.filterKey === "social" ||
    /linkedin|xing|facebook|instagram|twitter|x\.com|tiktok|steamcommunity|nexusmods/.test(
      blob
    )
  ) {
    return "public_profile";
  }
  if (/youtube\.|vimeo\.|tiktok\.com\/@|watch\?v=/.test(blob)) {
    return "video";
  }
  if (
    /presse|news|zeitung|magazine|spiegel|faz\.|sueddeutsche|tagesschau|reuters/.test(
      blob
    )
  ) {
    return "press";
  }
  if (
    /\.gov\b|bund\.de|behörde|finanzamt|polizei|bundes|ministerium|stadt-/.test(
      blob
    )
  ) {
    return "authority";
  }
  if (
    meta.filterKey === "company" ||
    /gmbh|ag\b|unternehmen|firma|karriere|jobs|imprint|impressum/.test(blob)
  ) {
    return "company";
  }
  if (meta.filterKey === "website" || meta.filterKey === "general") {
    return "website";
  }
  return "other";
}

export interface CategoryAggregate {
  key: OsintDisplayCategory;
  label: string;
  count: number;
  avgConfidence: number;
  riskLevel: "green" | "yellow" | "red";
  hits: IntelligenceHit[];
}

export function aggregateByOsintCategory(
  hits: IntelligenceHit[]
): CategoryAggregate[] {
  const buckets = new Map<OsintDisplayCategory, IntelligenceHit[]>();
  for (const hit of hits) {
    const key = classifyOsintCategory(hit);
    const list = buckets.get(key) ?? [];
    list.push(hit);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .map(([key, group]) => {
      const avgConfidence =
        group.length === 0
          ? 0
          : Math.round(
              group.reduce(
                (sum, hit) => sum + (hit.identityConfidence ?? 0),
                0
              ) / group.length
            );
      const critical = group.filter(
        (hit) => hit.severity === "critical" || hit.risk === "action"
      ).length;
      const high = group.filter(
        (hit) => hit.severity === "high" || hit.risk === "review"
      ).length;
      const riskLevel: CategoryAggregate["riskLevel"] =
        critical > 0
          ? "red"
          : high > 0 || avgConfidence >= 80
            ? "yellow"
            : "green";
      return {
        key,
        label: OSINT_CATEGORY_LABELS[key],
        count: group.length,
        avgConfidence,
        riskLevel,
        hits: group,
      };
    })
    .sort((a, b) => b.count - a.count);
}
