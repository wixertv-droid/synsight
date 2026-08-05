/**
 * Normalize Contabo deep-scan API payloads into SynSight demo modules.
 * Upstream may return flat findings with `source` (holehe, maigret, …).
 * SpiderFoot findings are dropped from scoring and module grouping.
 */

import {
  computeDemoExposureScore,
  filterScoreFindings,
} from "@/lib/demo/demo-exposure-score";

export type DemoRisk = "low" | "medium" | "high" | string;

export interface DemoFinding {
  category: string;
  title: string;
  description: string;
  platform?: string;
  detail?: string;
  risk: DemoRisk;
  confidence?: number;
  source?: string;
  url?: string;
}

export interface DemoModuleResult {
  id: string;
  label: string;
  status: "ok" | "empty" | "error" | "started";
  findings: DemoFinding[];
  count: number;
  summary: string;
}

export interface NormalizedDemoScan {
  status: "success" | "error";
  message?: string;
  query: string;
  queries: Record<string, string>;
  queryType: string;
  findings: DemoFinding[];
  modules: DemoModuleResult[];
  platforms: string[];
  exposure_score: number;
  risk_level: string;
  summary: string;
  timestamp: string;
  scan_ids: string[];
  source: "contabo-deep";
}

const MODULE_META: Record<string, { label: string; order: number }> = {
  holehe: { label: "Holehe · E-Mail Accounts", order: 10 },
  maigret: { label: "Maigret · Username OSINT", order: 20 },
  phoneinfoga: { label: "PhoneInfoga · Telefon", order: 30 },
  theharvester: { label: "theHarvester · Domain", order: 40 },
  theHarvester: { label: "theHarvester · Domain", order: 40 },
  photon: { label: "Photon · Web Crawl", order: 50 },
};

function moduleKey(source: string): string {
  const raw = (source || "unknown").trim();
  if (/spiderfoot/i.test(raw)) return "spiderfoot";
  if (/theharvester/i.test(raw)) return "theHarvester";
  return raw.toLowerCase() === "holehe"
    ? "holehe"
    : raw.toLowerCase() === "maigret"
      ? "maigret"
      : raw.toLowerCase() === "phoneinfoga"
        ? "phoneinfoga"
        : raw.toLowerCase() === "photon"
          ? "photon"
          : raw;
}

function moduleLabel(id: string): string {
  return MODULE_META[id]?.label || `${id} · Modul`;
}

export function findingFromUpstream(
  raw: Record<string, unknown>,
  fallbackSource: string
): DemoFinding | null {
  const source = String(raw.source || fallbackSource || "unknown");
  if (raw.error) {
    return {
      category: "ERROR",
      title: `${moduleLabel(moduleKey(source))} · Fehler`,
      description: String(raw.error),
      platform: source,
      risk: "low",
      source,
    };
  }

  const platform = String(raw.platform || raw.type || source || "OSINT");
  const url = typeof raw.url === "string" ? raw.url : undefined;
  const emails = Array.isArray(raw.emails) ? raw.emails.map(String) : [];
  const hosts = Array.isArray(raw.hosts) ? raw.hosts.map(String) : [];
  const rawText = typeof raw.raw === "string" ? raw.raw.trim() : "";
  const status = typeof raw.status === "string" ? raw.status : "";

  let title = String(raw.title || platform || "Treffer");
  let description = String(raw.description || raw.detail || "");

  if (url) {
    title = platform !== "Social/Web" ? platform : "Öffentliches Profil";
    description = description || url;
  }
  if (emails.length || hosts.length) {
    title = "Domain-Harvest";
    description = [
      emails.length ? `E-Mails: ${emails.slice(0, 8).join(", ")}` : "",
      hosts.length ? `Hosts: ${hosts.slice(0, 8).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (rawText) {
    title = title || "Rohdaten";
    description = description || rawText.slice(0, 420);
  }
  if (status === "started") {
    title = "Scan gestartet";
    description =
      description || "Modul-Scan wurde ausgelöst. Detail-Events folgen.";
  }

  if (!description && !url && !status) {
    description = "Öffentlicher Treffer ohne weitere Detailbeschreibung.";
  }

  return {
    category: String(raw.category || "OSINT"),
    title,
    description,
    platform,
    detail: url || rawText.slice(0, 500) || description,
    risk: String(raw.risk || "medium").toLowerCase(),
    confidence: typeof raw.confidence === "number" ? raw.confidence : undefined,
    source,
    url,
  };
}

function buildModuleSummaries(modules: DemoModuleResult[]): string {
  const parts = modules.map((m) => {
    if (m.status === "error") return `${m.label}: Fehler`;
    if (m.status === "started") return `${m.label}: gestartet`;
    if (m.count === 0) return `${m.label}: keine Treffer`;
    return `${m.label}: ${m.count} Treffer`;
  });
  return parts.join(" · ");
}

export function groupModules(findings: DemoFinding[]): DemoModuleResult[] {
  const buckets = new Map<string, DemoFinding[]>();
  for (const f of findings) {
    const id = moduleKey(f.source || "unknown");
    if (id === "spiderfoot") continue;
    const list = buckets.get(id) || [];
    list.push(f);
    buckets.set(id, list);
  }

  const modules: DemoModuleResult[] = [...buckets.entries()].map(
    ([id, items]) => {
      const errors = items.filter((i) => i.category === "ERROR");
      const started = items.some((i) => /gestartet|started/i.test(i.title));
      const real = items.filter((i) => i.category !== "ERROR");
      let status: DemoModuleResult["status"] = "ok";
      if (errors.length && real.length === 0) status = "error";
      else if (started && real.every((i) => /gestartet|started/i.test(i.title)))
        status = "started";
      else if (real.length === 0) status = "empty";

      const count = real.filter(
        (i) => !/gestartet|started/i.test(i.title)
      ).length;

      return {
        id,
        label: moduleLabel(id),
        status,
        findings: items,
        count,
        summary:
          status === "error"
            ? errors[0]?.description || "Modulfehler"
            : status === "started"
              ? "Scan gestartet — Detail-Events ausstehend"
              : count === 0
                ? "Keine Treffer in diesem Modul"
                : `${count} Datenpunkt(e) aus ${moduleLabel(id)}`,
      };
    }
  );

  modules.sort(
    (a, b) =>
      (MODULE_META[a.id]?.order ?? 100) - (MODULE_META[b.id]?.order ?? 100)
  );
  return modules;
}

export function normalizeUpstreamPayload(input: {
  payloads: Array<Record<string, unknown>>;
  queries: Record<string, string>;
}): NormalizedDemoScan {
  const { payloads, queries } = input;
  const queryLabel =
    Object.values(queries).filter(Boolean).join(" · ") || "unbekannt";

  const findings: DemoFinding[] = [];
  const scanIds: string[] = [];

  for (const data of payloads) {
    if (typeof data.scan_id === "string") scanIds.push(data.scan_id);
    const list = Array.isArray(data.findings) ? data.findings : [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const mapped = findingFromUpstream(
        item as Record<string, unknown>,
        "OSINT"
      );
      if (mapped) findings.push(mapped);
    }

    // Already-normalized SynSight/legacy shape
    if (data.status === "success" && Array.isArray(data.findings)) {
      // already handled via findings loop
    }
  }

  const scoredFindings = filterScoreFindings(findings);
  const modules = groupModules(scoredFindings);
  const { score, risk } = computeDemoExposureScore(scoredFindings);
  const platforms = [
    ...new Set(
      scoredFindings
        .map((f) => f.platform || f.source || "")
        .filter(Boolean)
        .map(String)
    ),
  ].slice(0, 16);

  const summary =
    scoredFindings.length === 0
      ? `Keine öffentlichen Treffer für „${queryLabel}“ in den aktiven Modulen.`
      : `Multi-Modul-Analyse für „${queryLabel}“: ${buildModuleSummaries(modules)}. Exposure-Score ${score}/100 (${risk}).`;

  return {
    status: "success",
    query: queryLabel,
    queries,
    queryType: Object.keys(queries).join("+") || "mixed",
    findings: scoredFindings,
    modules,
    platforms: platforms.length ? platforms : ["OSINT"],
    exposure_score: score,
    risk_level: risk,
    summary,
    timestamp: new Date().toISOString(),
    scan_ids: scanIds,
    source: "contabo-deep",
  };
}
