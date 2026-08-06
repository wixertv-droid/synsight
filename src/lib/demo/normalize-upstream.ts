/**
 * Normalize public DemoScanner API payloads into SynSight demo modules.
 *
 * The Contabo side has existed in several versions:
 * - single-module specialist API: { status, module, findings: [...] }
 * - older SpiderFoot API: { status, source: "spiderfoot", findings: [...] }
 * - debug / tool wrappers: nested results, modules, raw_output or summaries
 *
 * This normalizer is intentionally tolerant so a working scanner does not end
 * in an empty public result screen just because the payload shape is older.
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
  publicosint: { label: "Öffentlicher OSINT Deep-Scan", order: 60 },
  osint: { label: "Öffentlicher OSINT Deep-Scan", order: 60 },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function moduleKey(source: string): string {
  const raw = (source || "unknown").trim();
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (/spiderfoot|publicosint/.test(normalized)) return "publicosint";
  if (/theharvester|harvester/.test(normalized)) return "theHarvester";
  if (normalized === "holehe") return "holehe";
  if (normalized === "maigret") return "maigret";
  if (normalized === "phoneinfoga" || normalized === "phone") return "phoneinfoga";
  if (normalized === "photon") return "photon";
  if (normalized === "osint") return "osint";
  return raw;
}

function moduleLabel(id: string): string {
  return MODULE_META[id]?.label || `${id} · Modul`;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textFromUnknown(value: unknown, max = 700): string {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean).slice(0, 12).join(", ").slice(0, max);
  }
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value).slice(0, max);
    } catch {
      return "";
    }
  }
  return "";
}

function derivePayloadSource(data: Record<string, unknown>, fallback = "OSINT") {
  return (
    safeString(data.module) ||
    safeString(data.source) ||
    safeString(data.provider) ||
    fallback
  );
}

export function findingFromUpstream(
  raw: Record<string, unknown>,
  fallbackSource: string
): DemoFinding | null {
  const source = String(
    raw.source || raw.module || raw.provider || fallbackSource || "unknown"
  );
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

  const platform = String(
    raw.platform || raw.type || raw.service || raw.country || source || "OSINT"
  );
  const url = typeof raw.url === "string" ? raw.url : undefined;
  const emails = Array.isArray(raw.emails) ? raw.emails.map(String) : [];
  const hosts = Array.isArray(raw.hosts) ? raw.hosts.map(String) : [];
  const rawText =
    safeString(raw.raw) ||
    safeString(raw.raw_output) ||
    safeString(raw.output) ||
    safeString(raw.stdout) ||
    safeString(raw.data);
  const status = typeof raw.status === "string" ? raw.status : "";
  const country = safeString(raw.country);
  const carrier = safeString(raw.carrier) || safeString(raw.provider);

  let title = String(raw.title || platform || "Treffer");
  let description = String(raw.description || raw.detail || raw.message || "");

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
  if (source.toLowerCase().includes("phone") && (status || country || rawText)) {
    title = raw.title ? String(raw.title) : "Telefonnummer geprüft";
    description =
      description ||
      [
        status ? `Status: ${status}` : "",
        country ? `Land: ${country}` : "",
        carrier ? `Provider: ${carrier}` : "",
        rawText ? rawText.slice(0, 420) : "",
      ]
        .filter(Boolean)
        .join(" · ");
  }
  if (rawText && !description) {
    title = title || "Rohdaten";
    description = rawText.slice(0, 420);
  }
  if (status === "started") {
    title = "Scan gestartet";
    description =
      description || "Modul-Scan wurde ausgelöst. Detail-Events folgen.";
  }

  if (!description && !url) {
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

function collectFindingObjects(data: Record<string, unknown>): Array<{
  raw: Record<string, unknown>;
  fallbackSource: string;
}> {
  const fallbackSource = derivePayloadSource(data);
  const out: Array<{ raw: Record<string, unknown>; fallbackSource: string }> = [];

  const pushList = (items: unknown[], source: string) => {
    for (const item of items) {
      const record = asRecord(item);
      if (record) out.push({ raw: record, fallbackSource: source });
    }
  };

  pushList(asArray(data.findings), fallbackSource);
  pushList(asArray(data.results), fallbackSource);
  pushList(asArray(data.events), fallbackSource);
  pushList(asArray(data.items), fallbackSource);

  const nested = asRecord(data.data) || asRecord(data.payload) || null;
  if (nested) {
    const nestedSource = derivePayloadSource(nested, fallbackSource);
    pushList(asArray(nested.findings), nestedSource);
    pushList(asArray(nested.results), nestedSource);
    pushList(asArray(nested.events), nestedSource);
    pushList(asArray(nested.items), nestedSource);
  }

  const moduleArray = asArray(data.modules);
  for (const moduleEntry of moduleArray) {
    const moduleRecord = asRecord(moduleEntry);
    if (!moduleRecord) continue;
    const moduleSource = derivePayloadSource(moduleRecord, fallbackSource);
    pushList(asArray(moduleRecord.findings), moduleSource);
    pushList(asArray(moduleRecord.results), moduleSource);
    pushList(asArray(moduleRecord.items), moduleSource);
  }

  const moduleObject = asRecord(data.modules);
  if (moduleObject) {
    for (const [key, value] of Object.entries(moduleObject)) {
      if (Array.isArray(value)) {
        pushList(value, key);
      } else {
        const record = asRecord(value);
        if (!record) continue;
        const moduleSource = derivePayloadSource(record, key);
        pushList(asArray(record.findings), moduleSource);
        pushList(asArray(record.results), moduleSource);
        pushList(asArray(record.items), moduleSource);
      }
    }
  }

  // Fallback: some tool wrappers return useful data only on the top-level object.
  if (out.length === 0) {
    const total = Number(data.total_findings ?? data.result_count ?? data.count ?? 0);
    const hasSummary = Boolean(safeString(data.summary) || safeString(data.message));
    const hasRaw = Boolean(
      safeString(data.raw_output) || safeString(data.output) || safeString(data.stdout)
    );
    const topScore = Number(data.exposure_score ?? 0);
    if (total > 0 || topScore > 0 || hasRaw || hasSummary) {
      out.push({
        raw: {
          source: fallbackSource,
          category: total > 0 || topScore > 0 ? "OSINT" : "STATUS",
          title:
            total > 0 || topScore > 0
              ? "Öffentliche Scanner-Signale"
              : "Scan abgeschlossen",
          description:
            safeString(data.summary) ||
            safeString(data.message) ||
            textFromUnknown(data.raw_output || data.output || data.stdout) ||
            `${total} Datenpunkt(e) vom Scanner gemeldet.`,
          risk: safeString(data.risk_level) || "low",
          confidence: total > 0 ? Math.min(95, 55 + total * 4) : 40,
          detail: textFromUnknown(data),
        },
        fallbackSource,
      });
    }
  }

  return out;
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
    const id = moduleKey(f.source || f.platform || "unknown");
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
        (i) =>
          !/gestartet|started/i.test(i.title) &&
          i.category !== "STATUS" &&
          i.category !== "EMPTY"
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
  let upstreamSummary = "";
  let upstreamScore: number | null = null;
  let upstreamRisk = "";

  for (const data of payloads) {
    if (typeof data.scan_id === "string") scanIds.push(data.scan_id);
    if (typeof data.id === "string") scanIds.push(data.id);
    if (!upstreamSummary && typeof data.summary === "string") {
      upstreamSummary = data.summary;
    }
    if (typeof data.exposure_score === "number") {
      upstreamScore = data.exposure_score;
    }
    if (!upstreamRisk && typeof data.risk_level === "string") {
      upstreamRisk = data.risk_level;
    }

    for (const { raw, fallbackSource } of collectFindingObjects(data)) {
      const mapped = findingFromUpstream(raw, fallbackSource);
      if (mapped) findings.push(mapped);
    }
  }

  const scoredFindings = filterScoreFindings(findings);
  const modules = groupModules(scoredFindings.length ? scoredFindings : findings);
  const computed = computeDemoExposureScore(scoredFindings);
  const score = computed.usableCount > 0 ? computed.score : (upstreamScore ?? 0);
  const risk = computed.usableCount > 0 ? computed.risk : upstreamRisk || "Niedrig";
  const platforms = [
    ...new Set(
      (scoredFindings.length ? scoredFindings : findings)
        .map((f) => f.platform || f.source || "")
        .filter(Boolean)
        .map(String)
    ),
  ].slice(0, 16);

  const summary =
    scoredFindings.length === 0
      ? upstreamSummary ||
        `Keine öffentlichen Treffer für „${queryLabel}“ in den aktiven Modulen.`
      : upstreamSummary && upstreamSummary.length < 420
        ? upstreamSummary
        : `Multi-Modul-Analyse für „${queryLabel}": ${buildModuleSummaries(modules)}. Exposure-Score ${score}/100 (${risk}).`;

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
    scan_ids: [...new Set(scanIds)],
    source: "contabo-deep",
  };
}
