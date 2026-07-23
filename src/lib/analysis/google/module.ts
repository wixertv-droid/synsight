import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

export const googleIntelligenceModule: IntelligenceModuleDefinition = {
  key: "google_search",
  title: "Google Intelligence Report",
  estimatedDurationLabel: "ca. 30–90 Sekunden",
  minScanMs: 7000,
  maxScanMs: 10000,
  scanSteps: [
    {
      id: "init",
      label: "Initialisiere Suchanalyse …",
      terminal: "> INIT google_osint_pipeline()",
      atMs: 0,
    },
    {
      id: "connect",
      label: "Google Suchquellen werden verbunden …",
      terminal: "> CONNECT google_custom_search.v1",
      atMs: 800,
    },
    {
      id: "collect",
      label: "Öffentliche Treffer werden gesammelt …",
      terminal: "> COLLECT serp_items FROM query_plan[]",
      atMs: 1800,
    },
    {
      id: "match",
      label: "Identitäten werden abgeglichen …",
      terminal: "> MATCH identity_profile ↔ serp_hits",
      atMs: 2800,
    },
    {
      id: "phone",
      label: "Telefonnummern werden überprüft …",
      terminal: "> SCAN phone_signals IN hits[]",
      atMs: 3800,
    },
    {
      id: "email",
      label: "E-Mail-Adressen werden analysiert …",
      terminal: "> SCAN email_signals IN hits[]",
      atMs: 4700,
    },
    {
      id: "profiles",
      label: "Öffentliche Profile werden erkannt …",
      terminal: "> DETECT social_profiles + directories",
      atMs: 5600,
    },
    {
      id: "images",
      label: "Bilder werden indexiert …",
      terminal: "> INDEX image_mentions FROM snippets",
      atMs: 6500,
    },
    {
      id: "summary",
      label: "KI erstellt Zusammenfassung …",
      terminal: "> SUMMARIZE verified_hits ONLY (no fabrication)",
      atMs: 7400,
    },
    {
      id: "risk",
      label: "Risiken werden bewertet …",
      terminal: "> SCORE risk_matrix SOC_v2",
      atMs: 8400,
    },
    {
      id: "report",
      label: "Bericht wird erstellt …",
      terminal: "> BUILD intelligence_report.json",
      atMs: 9300,
    },
  ],
};
