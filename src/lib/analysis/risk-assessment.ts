import type {
  IntelligenceHit,
  IntelligenceHitRisk,
  IntelligenceRelevance,
  IntelligenceSummaryBuckets,
} from "@/lib/analysis/types";
import type { RiskLevel } from "@/types/platform";

const emailPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const phonePattern = /(\+?\d[\d\s().-]{7,}\d)/;

export function classifyHitContent(input: {
  title: string;
  snippet: string;
  url: string;
  category: string;
  sourceType: IntelligenceHit["sourceType"];
}): {
  relevance: IntelligenceRelevance;
  risk: IntelligenceHitRisk;
  isProblematic: boolean;
  shouldAct: boolean;
  canIgnore: boolean;
} {
  const text = `${input.title} ${input.snippet} ${input.url}`.toLowerCase();
  const hasEmail = emailPattern.test(text);
  const hasPhone = phonePattern.test(text);
  const sensitiveCategory = ["email", "phone", "address"].includes(
    input.category
  );

  if (input.sourceType === "identity_profile") {
    return {
      relevance: "relevant",
      risk: sensitiveCategory ? "watch" : "none",
      isProblematic: sensitiveCategory,
      shouldAct: sensitiveCategory,
      canIgnore: !sensitiveCategory,
    };
  }

  if (hasEmail || hasPhone) {
    return {
      relevance: "relevant",
      risk: "action",
      isProblematic: true,
      shouldAct: true,
      canIgnore: false,
    };
  }

  if (
    text.includes("impressum") ||
    text.includes("kontakt") ||
    text.includes("verzeichnis") ||
    text.includes("directory")
  ) {
    return {
      relevance: "relevant",
      risk: "review",
      isProblematic: true,
      shouldAct: true,
      canIgnore: false,
    };
  }

  if (
    text.includes("linkedin") ||
    text.includes("xing") ||
    input.category === "company"
  ) {
    return {
      relevance: "neutral",
      risk: "watch",
      isProblematic: false,
      shouldAct: false,
      canIgnore: true,
    };
  }

  return {
    relevance: "low",
    risk: "none",
    isProblematic: false,
    shouldAct: false,
    canIgnore: true,
  };
}

export function summarizeBuckets(
  hits: IntelligenceHit[]
): IntelligenceSummaryBuckets {
  const buckets: IntelligenceSummaryBuckets = {
    total: hits.length,
    relevant: 0,
    neutral: 0,
    low: 0,
    stale: 0,
  };

  for (const hit of hits) {
    buckets[hit.relevance] += 1;
  }

  return buckets;
}

export function computeOverallRisk(hits: IntelligenceHit[]): {
  riskScore: number;
  riskLevel: RiskLevel;
} {
  if (hits.length === 0) {
    return { riskScore: 12, riskLevel: "low" };
  }

  let score = 18;
  for (const hit of hits) {
    if (hit.risk === "action") score += 16;
    else if (hit.risk === "review") score += 10;
    else if (hit.risk === "watch") score += 5;
    if (hit.relevance === "relevant") score += 3;
  }

  const riskScore = Math.min(95, score);
  const riskLevel: RiskLevel =
    riskScore >= 70 ? "high" : riskScore >= 42 ? "medium" : "low";

  return { riskScore, riskLevel };
}

export function riskLabel(risk: IntelligenceHitRisk): string {
  switch (risk) {
    case "none":
      return "Kein Risiko";
    case "watch":
      return "Beobachten";
    case "review":
      return "Empfohlen zu prüfen";
    case "action":
      return "Handlungsbedarf";
  }
}

export function riskColorClass(risk: IntelligenceHitRisk): string {
  switch (risk) {
    case "none":
      return "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100/75";
    case "watch":
      return "border-amber-300/25 bg-amber-300/[0.06] text-amber-100/75";
    case "review":
      return "border-orange-400/25 bg-orange-400/[0.06] text-orange-100/75";
    case "action":
      return "border-rose-400/25 bg-rose-400/[0.06] text-rose-100/75";
  }
}
