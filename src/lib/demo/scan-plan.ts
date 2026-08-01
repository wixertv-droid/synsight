import type { ScanQueries } from "@/components/sections/DemoScanner/types";
import { normalizeScanQueries } from "@/lib/demo/normalize-queries";

export type DemoModuleId =
  | "holehe"
  | "maigret"
  | "phoneinfoga"
  | "theHarvester"
  | "photon"
  | "spiderfoot";

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
  spiderfoot: {
    label: "SpiderFoot",
    short: "Deep OSINT",
    color: "#22d3ee",
  },
};

/**
 * Sequential plan — one Contabo module call per step (avoids nginx timeout).
 * Order: specialist tools first, then SpiderFoot on the strongest targets.
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

  // SpiderFoot last — deepest correlation, one call per strong target
  if (queries.email) {
    steps.push({
      id: "sf-email",
      module: "spiderfoot",
      label: "SpiderFoot",
      hint: `Deep OSINT · ${queries.email}`,
      query: queries.email,
      field: "email",
    });
  }
  if (queries.domain) {
    steps.push({
      id: "sf-domain",
      module: "spiderfoot",
      label: "SpiderFoot",
      hint: `Deep OSINT · ${queries.domain}`,
      query: queries.domain,
      field: "domain",
    });
  }
  if (queries.username && !queries.email) {
    steps.push({
      id: "sf-username",
      module: "spiderfoot",
      label: "SpiderFoot",
      hint: `Deep OSINT · ${queries.username}`,
      query: queries.username,
      field: "username",
    });
  }
  if (queries.phone && !queries.email && !queries.username && !queries.domain) {
    steps.push({
      id: "sf-phone",
      module: "spiderfoot",
      label: "SpiderFoot",
      hint: `Deep OSINT · ${queries.phone}`,
      query: queries.phone,
      field: "phone",
    });
  }
  if (queries.url && Object.keys(queries).length === 1) {
    steps.push({
      id: "sf-url",
      module: "spiderfoot",
      label: "SpiderFoot",
      hint: `Deep OSINT · ${queries.url}`,
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
