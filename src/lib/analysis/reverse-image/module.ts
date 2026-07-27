import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

/** Combined module meta (Results Center / duration labels). */
export const reverseImageSearchModule: IntelligenceModuleDefinition = {
  key: "reverse_image_search",
  title: "Reverse Image Search",
  estimatedDurationLabel: "ca. 1–5 Minuten",
  minScanMs: 12000,
  maxScanMs: 300000,
  scanSteps: [
    {
      id: "prep",
      label: "Profilkennungen werden geladen",
      terminal: "IDENTITY · name + alias + username",
      atMs: 0,
    },
    {
      id: "serp",
      label: "Google Images via SerpAPI",
      terminal: "SERPAPI · google_images · safe=off · pagination",
      atMs: 2200,
    },
    {
      id: "fetch",
      label: "Bildlinks werden gespeichert",
      terminal: "CHECKPOINT · resultsByQuery · durable serp_cache",
      atMs: 5200,
    },
    {
      id: "face",
      label: "InsightFace Abgleich (Phase 2)",
      terminal: "INSIGHTFACE · compare · threshold gate",
      atMs: 8200,
    },
    {
      id: "report",
      label: "Visueller Report wird erstellt",
      terminal: "REPORT · matches → Gefundene_Bilder",
      atMs: 11000,
    },
  ],
};

/** Phase 1 — SerpAPI Bildsuche (eigene Animation im Reverse-Image-Tab). */
export const reverseImageDiscoveryModule: IntelligenceModuleDefinition = {
  key: "reverse_image_search",
  title: "Reverse Image · Bildsuche",
  estimatedDurationLabel: "ca. 30–180 Sekunden",
  minScanMs: 10000,
  maxScanMs: 600000,
  scanSteps: [
    {
      id: "identity",
      label: "Name, Alias und Benutzernamen laden",
      terminal: "IDENTITY · profile identifiers",
      atMs: 0,
    },
    {
      id: "serp-name",
      label: "Google Images · voller Name",
      terminal: "SERPAPI · google_images · name queries · safe=off",
      atMs: 1800,
    },
    {
      id: "serp-alias",
      label: "Google Images · Alias",
      terminal: "SERPAPI · google_images · alias queries",
      atMs: 4200,
    },
    {
      id: "serp-user",
      label: "Google Images · Benutzernamen",
      terminal: "SERPAPI · google_images · username open search",
      atMs: 6800,
    },
    {
      id: "persist",
      label: "Bildlinks speichern und auflisten",
      terminal: "CHECKPOINT · serp_cache_json · candidate list",
      atMs: 9200,
    },
  ],
};

/** Phase 2 — InsightFace Gesichtsvergleich (eigene Animation). */
export const reverseImageCompareModule: IntelligenceModuleDefinition = {
  key: "reverse_image_search",
  title: "Reverse Image · Gesichtsvergleich",
  estimatedDurationLabel: "ca. 30–300 Sekunden",
  minScanMs: 12000,
  maxScanMs: 600000,
  scanSteps: [
    {
      id: "refs",
      label: "Referenzbilder werden geladen",
      terminal: "VISION · load profile reference images",
      atMs: 0,
    },
    {
      id: "select",
      label: "Ausgewählte Bildlinks vorbereiten",
      terminal: "SELECT · user-chosen candidates",
      atMs: 2000,
    },
    {
      id: "download",
      label: "Kandidatenbilder werden geladen",
      terminal: "FETCH · public previews · temp storage",
      atMs: 4500,
    },
    {
      id: "face",
      label: "InsightFace 1:1 Abgleich",
      terminal: "INSIGHTFACE · compare · 1 SynCredit / Bild",
      atMs: 7500,
    },
    {
      id: "report",
      label: "Trefferbericht wird erstellt",
      terminal: "REPORT · matches → Gefundene_Bilder",
      atMs: 10500,
    },
  ],
};
