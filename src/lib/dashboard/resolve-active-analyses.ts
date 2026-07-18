import type { AnalysisKey } from "@/lib/credits/pricing";
import {
  analysisModules,
  type AnalysisModule,
  type AnalysisTier,
} from "@/lib/dashboard/analysis-center-data";

export interface CatalogAnalysisEntry {
  key: string;
  label: string;
  description: string;
  credits: number;
  sortOrder: number;
}

export type ResolvedAnalysisModule = AnalysisModule & { credits: number };

function inferTier(credits: number): AnalysisTier {
  if (credits >= 50) return "premium";
  if (credits >= 10) return "advanced";
  return "quick";
}

/**
 * Build the user-facing analysis list from the **active** admin catalog.
 * Inactive / removed analyses never appear on dashboard or Analyse Center.
 * Labels, descriptions and credits come from admin; UI enrichment (icons,
 * beginner copy) is merged when a known key exists.
 */
export function resolveActiveAnalyses(
  catalog: CatalogAnalysisEntry[]
): ResolvedAnalysisModule[] {
  const enrichment = new Map(
    analysisModules.map((module) => [module.id, module])
  );

  return catalog
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((entry) => {
      const known = enrichment.get(entry.key as AnalysisKey);
      if (known) {
        return {
          ...known,
          title: entry.label.trim() || known.title,
          description: entry.description.trim() || known.description,
          credits: entry.credits,
        };
      }

      return {
        id: entry.key as AnalysisKey,
        title: entry.label.trim() || entry.key,
        tagline: "Analyse aus der Preisverwaltung",
        description:
          entry.description.trim() ||
          "Diese Analyse wurde in der Administration freigeschaltet und ist für Ihr Konto verfügbar.",
        whatYouGet: [
          "Ergebnisübersicht",
          "Risikohinweise in Klartext",
          "Empfehlungen zum Weiterarbeiten",
        ],
        duration: "variabel",
        tier: inferTier(entry.credits),
        help: "Bezeichnung, Beschreibung und Preis kommen direkt aus der Admin-Preisverwaltung. Deaktivieren Sie die Analyse dort, verschwindet sie hier.",
        icon: "M12 3v18m9-9H3",
        accent: "from-cyber-blue/15 to-transparent",
        credits: entry.credits,
      };
    });
}
