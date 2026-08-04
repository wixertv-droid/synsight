import type { ScanQueries } from "@/components/sections/DemoScanner/types";
import { normalizeScanQueries } from "@/lib/demo/normalize-queries";

export type DemoModuleId =
  | "holehe"
  | "maigret"
  | "sherlock"
  | "phoneinfoga"
  | "spiderfoot";

export type ModuleStepStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "skipped";

export interface ScanStep {
  id: string;
  module: DemoModuleId;
  label: string;
  hint: string;
  query: string;
  field: keyof ScanQueries;
}

export interface ModuleStepState extends ScanStep {
  status: ModuleStepStatus;
  progress: number;
  findingCount: number;
  message?: string;
}

export const MODULE_META: Record<
  DemoModuleId,
  { label: string; short: string; color: string }
> = {
  holehe: {
    label: "Holehe",
    short: "E-Mail Accounts",
    color: "#70e7ff",
  },
  maigret: {
    label: "Maigret",
    short: "Username OSINT",
    color: "#29b6f6",
  },
  sherlock: {
    label: "Sherlock",
    short: "Social Search",
    color: "#00d4ff",
  },
  phoneinfoga: {
    label: "PhoneInfoga",
    short: "Telefon Intel",
    color: "#38bdf8",
  },
  spiderfoot: {
    label: "SpiderFoot",
    short: "Deep Korrelation",
    color: "#22d3ee",
  },
};

/**
 * Komplette Pipeline inkl. SpiderFoot als Deep-Korrelation.
 */
export function buildScanPlan(rawQueries: ScanQueries): ScanStep[] {
  const queries = normalizeScanQueries(rawQueries);
  const steps: ScanStep[] = [];

  if (queries.email) {
    steps.push({
      id: "holehe-email",
      module: "holehe",
      label: "Holehe",
      hint: "E-Mail Leaks & Plattformen",
      query: queries.email,
      field: "email",
    });
  }

  if (queries.username) {
    steps.push({
      id: "maigret-username",
      module: "maigret",
      label: "Maigret",
      hint: "Social Media Deep Scan",
      query: queries.username,
      field: "username",
    });
    steps.push({
      id: "sherlock-username",
      module: "sherlock",
      label: "Sherlock",
      hint: "Handle Cross-Check",
      query: queries.username,
      field: "username",
    });
  }

  if (queries.phone) {
    steps.push({
      id: "phoneinfoga-phone",
      module: "phoneinfoga",
      label: "PhoneInfoga",
      hint: "Carrier- & Standortprüfung",
      query: queries.phone,
      field: "phone",
    });
  }

  // SpiderFoot am Ende als Deep-Korrelation (nutzt die E-Mail oder den Username)
  const sfTarget = queries.email || queries.username || queries.phone;
  if (sfTarget) {
    steps.push({
      id: "spiderfoot-deep",
      module: "spiderfoot",
      label: "SpiderFoot",
      hint: "Deep OSINT Korrelation",
      query: sfTarget,
      field: queries.email ? "email" : queries.username ? "username" : "phone",
    });
  }

  return steps;
}

export function initialModuleStates(steps: ScanStep[]): ModuleStepState[] {
  return steps.map((step) => ({
    ...step,
    status: "pending",
    progress: 0,
    findingCount: 0,
  }));
}
