import type { ScanQueries } from "@/components/sections/DemoScanner/types";
import { normalizeScanQueries } from "@/lib/demo/normalize-queries";

export type DemoModuleId = "holehe" | "maigret" | "phoneinfoga";

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
    label: "Identitätsabgleich",
    short: "E-Mail-Signale",
    color: "#70e7ff",
  },
  maigret: {
    label: "Profilkorrelation",
    short: "Öffentliche Spuren",
    color: "#29b6f6",
  },
  phoneinfoga: {
    label: "Kommunikations-Metadaten",
    short: "Netz- und Anbieterprüfung",
    color: "#5ce1ff",
  },
};

/**
 * Public free scan plan — fast sequential calls only.
 * Heavy/deep modules stay out of the logged-out landing scan and belong to
 * paid or authenticated analysis flows later.
 */
export function buildScanPlan(rawQueries: ScanQueries): ScanStep[] {
  const queries = normalizeScanQueries(rawQueries);
  const steps: ScanStep[] = [];

  if (queries.email) {
    steps.push({
      id: "email-identity-correlation",
      module: "holehe",
      label: "Identitätsabgleich",
      hint: "E-Mail-Signale und Konto-Korrelation",
      query: queries.email,
      field: "email",
    });
  }
  if (queries.username) {
    steps.push({
      id: "public-profile-correlation",
      module: "maigret",
      label: "Profilkorrelation",
      hint: "Öffentliche Zuordnungen und Profilspuren",
      query: queries.username,
      field: "username",
    });
  }
  if (queries.phone) {
    steps.push({
      id: "communication-metadata-check",
      module: "phoneinfoga",
      label: "Kommunikations-Metadaten",
      hint: "Netz- und Anbieter-Metadaten",
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
