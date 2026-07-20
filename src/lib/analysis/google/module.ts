import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

export const googleIntelligenceModule: IntelligenceModuleDefinition = {
  key: "google_search",
  title: "Google Intelligence Report",
  minScanMs: 6000,
  maxScanMs: 10000,
  scanSteps: [
    {
      id: "boot",
      label: "Identitätsprofil wird geladen",
      terminal: "> INIT identity_profile.load()",
      atMs: 0,
    },
    {
      id: "queries",
      label: "Suchbegriffe werden erzeugt",
      terminal: "> GEN search_queries[] FROM profile_fields",
      atMs: 900,
    },
    {
      id: "index",
      label: "Index wird durchsucht",
      terminal: "> EXEC google_custom_search.v1 q=profile_queries",
      atMs: 2100,
    },
    {
      id: "stream",
      label: "Google-Ergebnisse werden verarbeitet",
      terminal: "> PARSE serp_items{title,link,snippet,displayLink}",
      atMs: 3400,
    },
    {
      id: "classify",
      label: "Treffer werden klassifiziert",
      terminal: "> CLASSIFY hits BY relevance,risk,visibility",
      atMs: 4700,
    },
    {
      id: "domains",
      label: "Domains werden bewertet",
      terminal: "> SCORE domains FROM displayLink",
      atMs: 5800,
    },
    {
      id: "profiles",
      label: "Öffentliche Profile werden erkannt",
      terminal: "> MAP profile_links + serp_matches",
      atMs: 6900,
    },
    {
      id: "threat",
      label: "Bedrohungsbewertung wird berechnet",
      terminal: "> COMPUTE threat_score SOC_v2",
      atMs: 8000,
    },
    {
      id: "finalize",
      label: "Report wird finalisiert",
      terminal: "> BUILD intelligence_report.json",
      atMs: 9200,
    },
  ],
};
