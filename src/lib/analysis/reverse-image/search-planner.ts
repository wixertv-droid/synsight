import type { IdentityView } from "@/lib/services/identity-service";
import {
  buildPrioritizedSearchTerms,
  maxPagesForPriority,
} from "@/lib/analysis/reverse-image/identity-priority";

export type ReverseImageQueryGroup = "name" | "alias" | "username" | "social";

export interface ReverseImageQueryPlan {
  id: string;
  label: string;
  query: string;
  group: ReverseImageQueryGroup;
  /**
   * Max. SerpAPI-Seiten (Obergrenze). Tatsächliche Seiten = adaptive Pagination.
   * 1 Call ≈ 1 Seite ≈ bis ~100 Bilder.
   */
  pages?: number;
  /** Identity-Priority 0–100 */
  priority?: number;
  priorityReason?: string;
}

/** @deprecated feste Caps — adaptive Pagination nutzt priority + maxPagesForPriority */
export const REVERSE_IMAGE_COST_PAGES = {
  username: 2,
  alias: 2,
  name: 2,
  social: 2,
} as const;

/**
 * Identity-first Query-Plan:
 * - Suchbegriffe nach Prioritäts-Score sortiert (Usernames zuerst)
 * - pages = Max-Obergrenze (adaptiv darunter gestoppt)
 * - schwache Begriffe (z. B. nur Vorname prio < 40) entfallen
 * - optional eine Foto-Variante für starken vollen Namen
 */
export function planReverseImageQueries(
  identity: IdentityView | null,
  options?: {
    identityScoreThreshold?: number;
    maxPagesPerQuery?: number;
  }
): ReverseImageQueryPlan[] {
  const terms = buildPrioritizedSearchTerms(identity, {
    identityScoreThreshold: options?.identityScoreThreshold,
  });
  const plans: ReverseImageQueryPlan[] = [];
  const seenQueries = new Set<string>();

  for (const [index, term] of terms.entries()) {
    const maxPages = Math.min(
      options?.maxPagesPerQuery ?? 2,
      maxPagesForPriority(term.priority)
    );
    if (maxPages <= 0) continue;

    const normalized = term.value.trim().toLowerCase();
    if (!normalized || seenQueries.has(normalized)) continue;
    seenQueries.add(normalized);

    const idPrefix =
      term.group === "username"
        ? "username-open"
        : term.group === "social"
          ? "social-open"
          : term.group === "alias"
            ? "alias-open"
            : "name-open";
    const id =
      term.group === "name" &&
      index === terms.findIndex((t) => t.group === "name")
        ? "name-open"
        : `${idPrefix}-${index}`;

    const labelPrefix =
      term.group === "username"
        ? "Benutzername"
        : term.group === "social"
          ? "Social"
          : term.group === "alias"
            ? "Alias"
            : "Name";

    plans.push({
      id,
      label: `${labelPrefix} · ${term.value}`,
      query: term.value.trim(),
      group: term.group,
      pages: maxPages,
      priority: term.priority,
      priorityReason: term.reason,
    });

    // Foto-Varianten nur für starke Personensignale
    if (
      (term.group === "name" || term.group === "alias") &&
      term.priority >= 85 &&
      !seenQueries.has(`${normalized}::photo`)
    ) {
      seenQueries.add(`${normalized}::photo`);
      plans.push({
        id: `${idPrefix}-photo-${index}`,
        label: `${labelPrefix} + Foto · ${term.value}`,
        query: `"${term.value.trim()}" portrait`,
        group: term.group,
        pages: Math.min(2, maxPages),
        priority: Math.max(0, term.priority - 5),
        priorityReason: `${labelPrefix} + Foto-Hinweis`,
      });
    }
  }

  const MAX_QUERIES = 15;
  return plans
    .sort(
      (a, b) =>
        (b.priority ?? 0) - (a.priority ?? 0) || a.query.localeCompare(b.query)
    )
    .slice(0, MAX_QUERIES);
}

/** Geschätzte Max-SerpAPI-Calls (Obergrenze — adaptiv oft weniger). */
export function estimateSerpApiPageCalls(
  plans: ReverseImageQueryPlan[]
): number {
  return plans.reduce((sum, plan) => sum + (plan.pages ?? 2), 0);
}

export function resolveReverseImageSubjectName(
  identity: IdentityView | null
): string {
  const first = identity?.personal.firstName?.trim() ?? "";
  const last = identity?.personal.lastName?.trim() ?? "";
  if (first && last) return `${first} ${last}`;
  return first || last || "Unbekannt";
}

/** @deprecated */
export function collectReverseImageHandles(
  identity: IdentityView | null
): string[] {
  return buildPrioritizedSearchTerms(identity).map((t) => t.value);
}
