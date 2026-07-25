import type { IntelligenceModuleDefinition } from "@/lib/analysis/types";

export const usernameIntelligenceModule: IntelligenceModuleDefinition = {
  key: "username_intelligence",
  title: "Username Intelligence Scan",
  estimatedDurationLabel: "ca. 20–60 Sekunden",
  minScanMs: 9000,
  maxScanMs: 14000,
  scanSteps: [
    {
      id: "fingerprint",
      label: "Generating Username Fingerprint",
      terminal: "USERNAME · fingerprint aliases + handles",
      atMs: 0,
    },
    {
      id: "profiles",
      label: "Searching Public Profiles",
      terminal: "SERP · quoted username · profile vector",
      atMs: 1200,
    },
    {
      id: "forums",
      label: "Searching Forums",
      terminal: "SERP · forum communities · dedupe",
      atMs: 2600,
    },
    {
      id: "communities",
      label: "Searching Communities",
      terminal: "SERP · social + community surfaces",
      atMs: 4000,
    },
    {
      id: "gaming",
      label: "Searching Gaming Platforms",
      terminal: "SERP · gaming handles · steam/epic",
      atMs: 5200,
    },
    {
      id: "developer",
      label: "Searching Developer Platforms",
      terminal: "SERP · github/gitlab/stack",
      atMs: 6400,
    },
    {
      id: "correlate",
      label: "Correlating Identity",
      terminal: "MATCH · identity signals · confidence bands",
      atMs: 7600,
    },
    {
      id: "confidence",
      label: "Calculating Confidence",
      terminal: "SCORE · hide <60% · group platforms",
      atMs: 8600,
    },
    {
      id: "report",
      label: "Generating AI Report",
      terminal: "GEMINI · digital identity analyst · facts only",
      atMs: 9800,
    },
  ],
};
