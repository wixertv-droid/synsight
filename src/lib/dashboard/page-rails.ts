import type { SystemRailSection } from "@/components/layout/SystemRail";

export const ANALYSIS_CENTER_RAIL: SystemRailSection[] = [
  { id: "analysis-intro", label: "START" },
  { id: "tier-premium", label: "PAKETE" },
  { id: "tier-quick", label: "QUICK" },
  { id: "tier-advanced", label: "ADVANCED" },
  { id: "analysis-admin-sync", label: "MODULE" },
];

export const RESULTS_CENTER_RAIL: SystemRailSection[] = [
  { id: "results-tabs", label: "REITER" },
  { id: "results-retention", label: "SPEICHERN" },
  { id: "results-body", label: "REPORT" },
];
