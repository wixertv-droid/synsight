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
      label: "SOC-Node online — Pipeline bootet …",
      terminal: "> BOOT synsight_soc_node // cleartext=false",
      atMs: 0,
    },
    {
      id: "auth",
      label: "Authentifiziere Suchkanäle …",
      terminal: "> AUTH google_custom_search.v1 · tls1.3",
      atMs: 700,
    },
    {
      id: "connect",
      label: "Deep-Web Index Gateways verbinden …",
      terminal: "> LINK serp_gateways[] · latency_probe()",
      atMs: 1500,
    },
    {
      id: "queries",
      label: "Profil-Queries werden injiziert …",
      terminal: "> INJECT query_plan FROM identity_profile",
      atMs: 2400,
    },
    {
      id: "collect",
      label: "SERP-Streams werden abgegriffen …",
      terminal: "> COLLECT serp_packets · fanout=parallel",
      atMs: 3400,
    },
    {
      id: "match",
      label: "Identitäts-Fingerprint Abgleich …",
      terminal: "> MATCH entity_graph ↔ serp_hits",
      atMs: 4400,
    },
    {
      id: "phone",
      label: "Telefon-Signale korrelieren …",
      terminal: "> CORRELATE phone_signals IN hits[]",
      atMs: 5400,
    },
    {
      id: "email",
      label: "E-Mail-Exfiltration prüfen …",
      terminal: "> SCAN email_exposure · public_index",
      atMs: 6400,
    },
    {
      id: "profiles",
      label: "Social Graph Mapping …",
      terminal: "> MAP social_profiles + directories",
      atMs: 7400,
    },
    {
      id: "images",
      label: "Medien-Artefakte indexieren …",
      terminal: "> INDEX media_artifacts FROM snippets",
      atMs: 8400,
    },
    {
      id: "threat",
      label: "Threat-Heatmap berechnen …",
      terminal: "> COMPUTE threat_heatmap SOC_v3",
      atMs: 9400,
    },
    {
      id: "summary",
      label: "KI-Lagebild generieren …",
      terminal: "> SUMMARIZE verified_hits · gemini_channel",
      atMs: 10400,
    },
    {
      id: "report",
      label: "Enterprise Report versiegeln …",
      terminal: "> SEAL intelligence_report.json · sha256",
      atMs: 11400,
    },
  ],
};
