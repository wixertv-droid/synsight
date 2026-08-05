import type { ScanQueries } from "@/components/sections/DemoScanner/types";
import { normalizeScanQueries } from "@/lib/demo/normalize-queries";

export type DemoModuleId =
  "holehe" | "maigret" | "phoneinfoga" | "theHarvester" | "photon";

export type ModuleStepStatus =
  "pending" | "running" | "done" | "error" | "skipped";

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
  phoneinfoga: {
    label: "PhoneInfoga",
    short: "Telefon Intel",
    color: "#5ce1ff",
  },
  theHarvester: {
    label: "theHarvester",
    short: "Domain Harvest",
    color: "#00d4ff",
  },
  photon: {
    label: "Photon",
    short: "Web Crawl",
    color: "#a7f3ff",
  },
};

/**
 * Sequential plan — one Contabo module call per step (avoids nginx timeout).
 * Order: Holehe → Maigret → PhoneInfoga → theHarvester → Photon
 * (only steps with matching input fields).
 */
export function buildScanPlan(rawQueries: ScanQueries): ScanStep[] {
  const queries = normalizeScanQueries(rawQueries);
  const steps: ScanStep[] = [];

  if (queries.email) {
    steps.push({
      id: "holehe-email",
      module: "holehe",
      label: "Holehe",
      hint: "Account-Nachweise zur E-Mail",
      query: queries.email,
      field: "email",
    });
  }
  if (queries.username) {
    steps.push({
      id: "maigret-username",
      module: "maigret",
      label: "Maigret",
      hint: "Öffentliche Profile zum Username",
      query: queries.username,
      field: "username",
    });
  }
  if (queries.phone) {
    steps.push({
      id: "phoneinfoga-phone",
      module: "phoneinfoga",
      label: "PhoneInfoga",
      hint: "Telefon-/Carrier-Hinweise",
      query: queries.phone,
      field: "phone",
    });
  }
  if (queries.domain) {
    steps.push({
      id: "harvester-domain",
      module: "theHarvester",
      label: "theHarvester",
      hint: "E-Mails & Hosts zur Domain",
      query: queries.domain,
      field: "domain",
    });
  }
  if (queries.url) {
    steps.push({
      id: "photon-url",
      module: "photon",
      label: "Photon",
      hint: "Web-Crawl & Keys",
      query: queries.url,
      field: "url",
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
