/**
 * Central SynCredits price book.
 * Change amounts here (or later via admin DB) without touching UI call sites.
 */

export type AnalysisKey =
  | "google_search"
  | "domain_analysis"
  | "email_analysis"
  | "social_media"
  | "person_search"
  | "reverse_image_search"
  | "ai_summary"
  | "pdf_report"
  | "deep_intelligence"
  | "full_identity_analysis";

export interface AnalysisPrice {
  key: AnalysisKey;
  label: string;
  credits: number;
  description: string;
}

export const ANALYSIS_PRICES: readonly AnalysisPrice[] = [
  {
    key: "google_search",
    label: "Google Suche",
    credits: 2,
    description: "Öffentliche Webtreffer zu Identitätssignalen.",
  },
  {
    key: "domain_analysis",
    label: "Domain Analyse",
    credits: 5,
    description: "Domain-Risiko und Exposition.",
  },
  {
    key: "email_analysis",
    label: "Email Analyse",
    credits: 6,
    description: "E-Mail-Exposition und Leak-Signale.",
  },
  {
    key: "social_media",
    label: "Social Media",
    credits: 10,
    description: "Profil- und Alias-Korrelation.",
  },
  {
    key: "person_search",
    label: "Personensuche",
    credits: 15,
    description: "Personenbezogene Spurensuche.",
  },
  {
    key: "reverse_image_search",
    label: "Reverse Image Search",
    credits: 25,
    description: "Bildbasierte Wiedererkennung.",
  },
  {
    key: "ai_summary",
    label: "KI-Zusammenfassung",
    credits: 20,
    description: "Verdichtete Risikobewertung.",
  },
  {
    key: "pdf_report",
    label: "PDF Report",
    credits: 10,
    description: "Exportierbarer Bericht.",
  },
  {
    key: "deep_intelligence",
    label: "Deep Intelligence Analyse",
    credits: 60,
    description: "Tiefe Korrelation über mehrere Quellen.",
  },
  {
    key: "full_identity_analysis",
    label: "Komplette Identitätsanalyse",
    credits: 100,
    description: "Vollständige Identitätsprüfung.",
  },
] as const;

const priceByKey = new Map(
  ANALYSIS_PRICES.map((entry) => [entry.key, entry] as const)
);

export function getAnalysisPrice(key: string): AnalysisPrice | null {
  return priceByKey.get(key as AnalysisKey) ?? null;
}

export function listAnalysisPrices(): AnalysisPrice[] {
  return [...ANALYSIS_PRICES];
}

/** Static package catalog — DB seed mirrors these values. */
export interface CreditPackageDefinition {
  code: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceCents: number;
  currency: string;
  badge: string | null;
  sortOrder: number;
}

export const CREDIT_PACKAGE_DEFINITIONS: readonly CreditPackageDefinition[] = [
  {
    code: "pack_500",
    name: "Starter",
    credits: 500,
    bonusCredits: 0,
    priceCents: 500,
    currency: "EUR",
    badge: null,
    sortOrder: 10,
  },
  {
    code: "pack_1700",
    name: "Focus",
    credits: 1500,
    bonusCredits: 200,
    priceCents: 1500,
    currency: "EUR",
    badge: "+200 Bonus",
    sortOrder: 20,
  },
  {
    code: "pack_3600",
    name: "Protect",
    credits: 3000,
    bonusCredits: 600,
    priceCents: 3000,
    currency: "EUR",
    badge: "+600 Bonus",
    sortOrder: 30,
  },
  {
    code: "pack_7800",
    name: "Command",
    credits: 6000,
    bonusCredits: 1800,
    priceCents: 6000,
    currency: "EUR",
    badge: "+1800 Bonus",
    sortOrder: 40,
  },
] as const;

export function formatEuroFromCents(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function totalCredits(pack: CreditPackageDefinition): number {
  return pack.credits + pack.bonusCredits;
}
