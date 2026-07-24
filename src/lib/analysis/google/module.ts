import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

export const googleIntelligenceModule: IntelligenceModuleDefinition = {
  key: "google_search",
  title: "Google Intelligence Report",
  estimatedDurationLabel: "ca. 30–90 Sekunden",
  minScanMs: 11000,
  maxScanMs: 14000,
  scanSteps: [
    {
      id: "boot",
      label: "Identitätsprofil wird erstellt",
      terminal: "> BUILD identity_profile FROM user_input",
      atMs: 0,
    },
    {
      id: "auth",
      label: "Suchstrategie wird berechnet",
      terminal: "> PLAN search_strategy · max_queries=5",
      atMs: 900,
    },
    {
      id: "connect",
      label: "Google wird analysiert",
      terminal: "> SEARCH serpapi.google · parallel=2",
      atMs: 2000,
    },
    {
      id: "queries",
      label: "Treffer werden verifiziert",
      terminal: "> VERIFY organic_results · dedupe+junk_filter",
      atMs: 3400,
    },
    {
      id: "collect",
      label: "Confidence Score wird berechnet",
      terminal: "> SCORE identity_confidence · matcher_v2",
      atMs: 4800,
    },
    {
      id: "match",
      label: "Risiken werden bewertet",
      terminal: "> ASSESS risk_heatmap · severity_map",
      atMs: 6400,
    },
    {
      id: "summary",
      label: "KI erstellt Lagebild",
      terminal: "> SUMMARIZE verified_hits>=70 · gemini_channel",
      atMs: 8200,
    },
    {
      id: "report",
      label: "Intelligence Report versiegelt",
      terminal: "> SEAL intelligence_report.json · sha256",
      atMs: 10400,
    },
  ],
};
