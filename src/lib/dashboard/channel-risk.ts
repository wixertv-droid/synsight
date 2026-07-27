/**
 * Severity-weighted risk for dashboard radar channels.
 * Critical/action hits push scores toward extreme; ignoring/resolving
 * those hits (via filtered reports) pulls the channel back toward green.
 */
import type { IntelligenceHit } from "@/lib/analysis/types";
import { isLiveSerpSource } from "@/lib/analysis/types";
import type { DigitalExposureFinding } from "@/lib/analysis/digital-exposure/types";
import type { UsernameHit } from "@/lib/analysis/username/types";

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Soft saturation so a few criticals reach extreme, many lows stay mid. */
function saturate(weightSum: number, scale = 48): number {
  if (weightSum <= 0) return 0;
  return clampScore(100 * (1 - Math.exp(-weightSum / scale)));
}

function hitWeight(hit: Pick<IntelligenceHit, "severity" | "risk">): number {
  if (hit.severity === "critical" || hit.risk === "action") return 42;
  if (hit.severity === "high" || hit.risk === "review") return 26;
  if (hit.severity === "medium" || hit.risk === "watch") return 12;
  return 5;
}

export function scoreHitsRisk(
  hits: Array<Pick<IntelligenceHit, "severity" | "risk">>
): number {
  if (hits.length === 0) return 0;
  const sum = hits.reduce((acc, hit) => acc + hitWeight(hit), 0);
  return saturate(sum);
}

function categoryOf(hit: IntelligenceHit): string {
  return (hit.filterCategory || hit.category || "other").toLowerCase();
}

export function partitionGoogleHits(hits: IntelligenceHit[]): {
  allLive: IntelligenceHit[];
  profile: IntelligenceHit[];
  websites: IntelligenceHit[];
  mentions: IntelligenceHit[];
} {
  const allLive = hits.filter((h) => isLiveSerpSource(h.sourceType));
  const profile = allLive.filter((h) =>
    ["social", "image"].includes(categoryOf(h))
  );
  const websites = allLive.filter((h) =>
    ["website", "general", "name", "company"].includes(categoryOf(h))
  );
  const profileSet = new Set(profile.map((h) => h.id));
  const websiteSet = new Set(websites.map((h) => h.id));
  const mentions = allLive.filter(
    (h) => !profileSet.has(h.id) && !websiteSet.has(h.id)
  );
  return { allLive, profile, websites, mentions };
}

export function scoreLeakFindings(findings: DigitalExposureFinding[]): {
  value: number;
  count: number;
} {
  const leaks = findings.filter(
    (f) => f.type === "BREACH" || f.type === "PASSWORD_EXPOSURE"
  );
  if (leaks.length === 0) return { value: 0, count: 0 };
  let sum = 0;
  for (const f of leaks) {
    if (f.type === "PASSWORD_EXPOSURE") sum += 48;
    else if (f.riskLevel === "high") sum += 36;
    else if (f.riskLevel === "medium") sum += 18;
    else sum += 8;
  }
  return { value: saturate(sum, 42), count: leaks.length };
}

export function scoreUsernameHits(hits: UsernameHit[]): {
  value: number;
  count: number;
} {
  if (hits.length === 0) return { value: 0, count: 0 };
  let sum = 0;
  for (const h of hits) {
    if (h.isProblematic || h.riskLevel === "high") sum += 36;
    else if (h.riskLevel === "medium") sum += 16;
    else sum += 6;
  }
  return { value: saturate(sum, 44), count: hits.length };
}

export function scoreReverseImageHits(
  hits: Array<{ similarity: number; riskLevel?: string }>
): { value: number; count: number } {
  if (hits.length === 0) return { value: 0, count: 0 };
  let sum = 0;
  for (const hit of hits) {
    const pct = hit.similarity * 100;
    if (pct >= 90 || hit.riskLevel === "high") sum += 40;
    else if (pct >= 75 || hit.riskLevel === "medium") sum += 22;
    else sum += 10;
  }
  return { value: saturate(sum, 42), count: hits.length };
}

export function rebuildGoogleCategoryStats(hits: IntelligenceHit[]) {
  const live = hits.filter((h) => isLiveSerpSource(h.sourceType));
  const stats = {
    websites: 0,
    social: 0,
    images: 0,
    phones: 0,
    emails: 0,
    companies: 0,
    documents: 0,
    press: 0,
    forums: 0,
    other: 0,
    mentions: live.length,
  };
  for (const hit of live) {
    const cat = categoryOf(hit);
    if (cat === "social") stats.social += 1;
    else if (cat === "image") stats.images += 1;
    else if (cat === "website" || cat === "general" || cat === "name")
      stats.websites += 1;
    else if (cat === "company") stats.companies += 1;
    else if (cat === "document") stats.documents += 1;
    else if (cat === "press") stats.press += 1;
    else if (cat === "forum") stats.forums += 1;
    else if (cat === "email") stats.emails += 1;
    else if (cat === "phone") stats.phones += 1;
    else stats.other += 1;
  }
  return stats;
}
