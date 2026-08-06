/**
 * Normalize public DemoScanner API payloads into SynSight demo modules.
 *
 * Internal providers stay internal. The public UI receives neutral module labels
 * and cleaned findings so the free scan does not expose implementation details.
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
  holehe: { label: "Identitätsabgleich", order: 10 },
  maigret: { label: "Profilkorrelation", order: 20 },
  phoneinfoga: { label: "Kommunikations-Metadaten", order: 30 },
  publicosint: { label: "Öffentlicher Schnellcheck", order: 60 },
  osint: { label: "Öffentlicher Schnellcheck", order: 60 },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function moduleKey(source: string): string {
  const raw = (source || "unknown").trim();
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (/spiderfoot|publicosint/.test(normalized)) return "publicosint";
  if (normalized === "holehe") return "holehe";
  if (normalized === "maigret") return "maigret";
  if (normalized === "phoneinfoga" || normalized === "phone") return "phoneinfoga";
  if (normalized === "osint") return "osint";
  return raw;
}

function moduleLabel(id: string): string {
  return MODULE_META[id]?.label || "Öffentlicher Schnellcheck";
}

function derivePayloadSource(data: Record<string, unknown>, fallback = "OSINT") {
  return (
    safeString(data.module) ||
    safeString(data.source) ||
    safeString(data.provider) ||
    fallback
  );
}

function countryLabel(value: string): string {
  const v = value.trim();
  if (!v) return "Nicht sicher bestimmbar";
  const normalized = v.toLowerCase();
  if (["de", "deu", "germany", "deutschland"].includes(normalized)) {
    return "Deutschland";
  }
  if (["at", "aut", "austria", "österreich", "oesterreich"].includes(normalized)) {
    return "Österreich";
  }
  if (["ch", "che", "switzerland", "schweiz"].includes(normalized)) {
    return "Schweiz";
  }
  return v;
}

function normalizeBoolText(value: unknown): "Ja" | "Nein" | "Nicht eindeutig" {
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "valid", "ja", "yes", "1"].includes(text)) return "Ja";
  if (["false", "invalid", "nein", "no", "0"].includes(text)) return "Nein";
  return "Nicht eindeutig";
}

function pickPattern(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[|;,]+$/, "");
  }
  return "";
}

function isPhoneFinding(raw: Record<string, unknown>, source: string): boolean {
  return (
    /phone|telefon|number|carrier|provider/i.test(source) ||
    /phone|telefon/i.test(String(raw.category || "")) ||
    /telefon/i.test(String(raw.title || ""))
  );
}

function buildPhoneFinding(
  raw: Record<string, unknown>,
  source: string
): DemoFinding {
  const combinedText = [
    raw.description,
    raw.detail,
    raw.raw,
    raw.raw_output,
    raw.output,
    raw.stdout,
    raw.data,
  ]
    .map((value) => textFromUnknown(value, 1200))
    .filter(Boolean)
    .join("\n");

  const provider =
    safeString(raw.carrier) ||
    safeString(raw.provider) ||
    pickPattern(combinedText, [
      /provider\s*[:|]\s*([^|\n]+)/i,
      /carrier\s*[:|]\s*([^|\n]+)/i,
      /operator\s*[:|]\s*([^|\n]+)/i,
      /anbieter\s*[:|]\s*([^|\n]+)/i,
    ]) ||
    "Nicht eindeutig zuordenbar";

  const country = countryLabel(
    safeString(raw.country) ||
      safeString(raw.region) ||
      pickPattern(combinedText, [
        /country\s*[:|]\s*([^|\n]+)/i,
        /region\s*[:|]\s*([^|\n]+)/i,
        /land\s*[:|]\s*([^|\n]+)/i,
      ])
  );

  const validRaw =
    raw.valid ??
    raw.is_valid ??
    raw.valid_number ??
    raw.status ??
    pickPattern(combinedText, [
      /nummer\s+g[uü]ltig\s*[:|]\s*(true|false|ja|nein|valid|invalid)/i,
      /valid\s*[:|=]\s*(true|false|yes|no|valid|invalid)/i,
      /status\s*[:|]\s*(valid|invalid|true|false)/i,
    ]);

  const validLabel = normalizeBoolText(validRaw);
  const isValid = validLabel === "Ja";
  const detailLines = [
    "Status: Für die angegebene Rufnummer konnten verwertbare Netz- und Metadatensignale korreliert werden.",
    `Rufnummer validiert: ${validLabel}`,
    `Netzbetreiber: ${provider}`,
    `Regionale Zuordnung: ${country}`,
    isValid
      ? "Bewertung: Die Nummer ist strukturell valide und einem aktiven Mobilfunkkontext zuzuordnen."
      : "Bewertung: Die Nummer konnte nicht eindeutig als aktiv bestätigt werden; die Metadaten bleiben prüfenswert.",
  ];

  return {
    category: "PHONE",
    title: "Telekommunikations-Intelligenz",
    description: detailLines.join("\n"),
    platform: provider,
    detail: detailLines.join("\n"),
    risk: String(raw.risk || "medium").toLowerCase(),
    confidence: typeof raw.confidence === "number" ? raw.confidence : 70,
    source,
  };
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
      platform: moduleLabel(moduleKey(source)),
      risk: "low",
      source,
    };
  }

  if (isPhoneFinding(raw, source)) {
    return buildPhoneFinding(raw, source);
  }

  const platform = String(
    raw.platform || raw.type || raw.service || raw.country || moduleLabel(moduleKey(source))
  );
  const url = typeof raw.url === "string" ? raw.url : undefined;
  const rawText =
    safeString(raw.raw) ||
    safeString(raw.raw_output) ||
    safeString(raw.output) ||
    safeString(raw.stdout) ||
    safeString(raw.data);
  const status = typeof raw.status === "string" ? raw.status : "";

  let title = String(raw.title || platform || "Öffentlicher Treffer");
  let description = String(raw.description || raw.detail || raw.message || "");

  if (url) {
    title = platform !== "Social/Web" ? platform : "Öffentliches Profil";
    description = description || url;
  }
  if (rawText && !description) {
    description = rawText.slice(0, 420);
  }
  if (status === "started") {
    title = "Prüfung gestartet";
    description =
      description || "Die öffentliche Korrelation wurde ausgelöst. Detaildaten folgen.";
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
              ? "Öffentliche Signale"
              : "Prüfung abgeschlossen",
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
      else if (started && real.every((i) => /gestartet|started/i.test(i.title))) {
        status = "started";
      } else if (real.length === 0) status = "empty";

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
            ? errors[0]?.description || "Prüfschritt nicht verfügbar"
            : status === "started"
              ? "Prüfung gestartet — Detaildaten ausstehend"
              : count === 0
                ? "Keine öffentlichen Treffer in diesem Prüfschritt"
                : `${count} öffentliche Signal(e)`,
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
        `Keine öffentlichen Treffer für „${queryLabel}“ in den aktiven Prüfschritten.`
      : upstreamSummary && upstreamSummary.length < 420
        ? upstreamSummary
        : `Schnellcheck für „${queryLabel}": ${buildModuleSummaries(modules)}. Exposure-Score ${score}/100 (${risk}).`;

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
