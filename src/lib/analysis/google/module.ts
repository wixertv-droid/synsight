import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

/** Sprint 6C — 8 Phasen Enterprise Intelligence Pipeline */
export const googleIntelligenceModule: IntelligenceModuleDefinition = {
  key: "google_search",
  title: "Google Intelligence Report",
  estimatedDurationLabel: "ca. 30–90 Sekunden",
  minScanMs: 12000,
  maxScanMs: 15000,
  scanSteps: [
    {
      id: "phase1",
      label: "Identity Fingerprint wird erstellt",
      terminal: "PHASE 1 · identity_fingerprint.build()",
      atMs: 0,
    },
    {
      id: "phase2",
      label: "Search Strategy wird berechnet",
      terminal: "PHASE 2 · recon_matrix · max=12 · google+bing",
      atMs: 1200,
    },
    {
      id: "phase3",
      label: "OSINT Recon · Google + Bing Vectors",
      terminal: "PHASE 3 · serpapi.hybrid · safe=off · parallel=4",
      atMs: 2600,
    },
    {
      id: "phase4",
      label: "Treffer werden normalisiert",
      terminal: "PHASE 4 · entity_match + normalize",
      atMs: 4200,
    },
    {
      id: "phase5",
      label: "Duplikate & Profile aggregiert",
      terminal: "PHASE 5 · duplicate_resolver · profile_merge",
      atMs: 5600,
    },
    {
      id: "phase6",
      label: "Confidence Engine bewertet",
      terminal: "PHASE 6 · confidence_engine · checks",
      atMs: 7200,
    },
    {
      id: "phase7",
      label: "Threat Matrix berechnet",
      terminal: "PHASE 7 · threat_evaluator · 7 dimensions",
      atMs: 8800,
    },
    {
      id: "phase8",
      label: "KI erstellt Intelligence Report",
      terminal: "PHASE 8 · gemini · facts_only · verified>=70",
      atMs: 10600,
    },
  ],
};
