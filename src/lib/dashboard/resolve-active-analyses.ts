import type { AnalysisKey } from "@/lib/credits/pricing";
import { isReplacedAnalysisKey } from "@/lib/credits/pricing";
import {
  extractActiveAnalysisKeys,
  isAnalysisKeyActive,
} from "@/lib/credits/resolve-active-analyses";
import {
  analysisModules,
  type AnalysisModule,
  type AnalysisTier,
} from "@/lib/dashboard/analysis-center-data";

export { extractActiveAnalysisKeys, isAnalysisKeyActive };

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

/** Keys that are billed in-flow (not standalone Analyse Center cards). */
const IN_FLOW_ANALYSIS_KEYS = new Set<string>([]);

/**
 * Build the user-facing analysis list from the **active** admin catalog.
 * Inactive / removed analyses never appear on dashboard or Analyse Center.
 * Labels, descriptions and credits come from admin; UI enrichment (icons,
 * beginner copy) is merged when a known key exists.
 *
 * When `digital_leak_exposure` is active, legacy phone/email modules stay
 * hidden even if they were reactivated by an admin reset.
 */
export function resolveActiveAnalyses(
  catalog: CatalogAnalysisEntry[]
): ResolvedAnalysisModule[] {
  const enrichment = new Map(
    analysisModules.map((module) => [module.id, module])
  );
  const hasDigitalLeak = catalog.some(
    (entry) => entry.key === "digital_leak_exposure"
  );

  return catalog
    .filter((entry) => !(hasDigitalLeak && isReplacedAnalysisKey(entry.key)))
    .filter((entry) => !IN_FLOW_ANALYSIS_KEYS.has(entry.key))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((entry) => {
      const lookupKey =
        entry.key === "reverse_image_search"
          ? "public_image_exposure_scan"
          : entry.key === "reverse_image_discovery"
            ? "public_image_exposure_scan"
            : entry.key === "reverse_image_compare"
              ? "face_identity_verification"
              : entry.key;
      const known = enrichment.get(lookupKey as AnalysisKey);
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
