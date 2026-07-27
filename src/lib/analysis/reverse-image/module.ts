import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

export const reverseImageSearchModule: IntelligenceModuleDefinition = {
  key: "reverse_image_search",
  title: "Reverse Image Search",
  estimatedDurationLabel: "ca. 30–90 Sekunden",
  minScanMs: 12000,
  maxScanMs: 45000,
  scanSteps: [
    {
      id: "prep",
      label: "Referenzbilder werden geladen",
      terminal: "VISION · load profile reference images",
      atMs: 0,
    },
    {
      id: "serp",
      label: "Google Images via SerpAPI",
      terminal: "SERPAPI · google_images · name + username queries",
      atMs: 2200,
    },
    {
      id: "fetch",
      label: "Kandidaten werden heruntergeladen",
      terminal: "FETCH · public index previews only · temp storage",
      atMs: 5200,
    },
    {
      id: "face",
      label: "InsightFace Abgleich",
      terminal: "INSIGHTFACE · compare · threshold gate",
      atMs: 8200,
    },
    {
      id: "report",
      label: "Visueller Report wird erstellt",
      terminal: "REPORT · matches → Gefundene_Bilder · negatives purged",
      atMs: 11000,
    },
  ],
};
