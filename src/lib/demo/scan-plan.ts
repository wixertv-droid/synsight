import type { ScanQueries } from "@/components/sections/DemoScanner/types";
import { normalizeScanQueries } from "@/lib/demo/normalize-queries";

export type DemoModuleId =
  | "holehe"
  | "maigret"
  | "sherlock"
  | "phoneinfoga";

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
};

/**
 * High-Speed Pipeline: Reduziert auf die schnellsten Top-Tools für maximale Performance unter 8 Sekunden.
 */
export function buildScanPlan(rawQueries: ScanQueries): ScanStep[] {
  const queries = normalizeScanQueries(rawQueries);
  const steps: ScanStep[] = [];

  if (queries.email) {
    steps.push({
      id: "holehe-email",
      module: "holehe",
      label: "Holehe",
      hint: "E-Mail Leaks & Plattform-Check",
      query: queries.email,
      field: "email",
    });
  }

  if (queries.username) {
    steps.push({
      id: "maigret-username",
      module: "maigret",
      label: "Maigret",
      hint: "High-Speed Social Profile Scan",
      query: queries.username,
      field: "username",
    });
    steps.push({
      id: "sherlock-username",
      module: "sherlock",
      label: "Sherlock",
      hint: "Cross-Platform Handle Abgleich",
      query: queries.username,
      field: "username",
    });
  }

  if (queries.phone) {
    steps.push({
      id: "phoneinfoga-phone",
      module: "phoneinfoga",
      label: "PhoneInfoga",
      hint: "Carrier & Nummern-Validierung",
      query: queries.phone,
      field: "phone",
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
