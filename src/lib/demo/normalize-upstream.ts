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
  "phone-exposure": { label: "Öffentliche Rufnummern-Fundstellen", order: 25 },
  phoneinfoga: { label: "Technische Rufnummernprüfung", order: 30 },
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

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function cleanExtractedValue(value: string): string {
  const cleaned = stripAnsi(value)
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/[|;,]+$/g, "")
    .replace(/\\n/g, " ")
    .trim();
  if (!cleaned || /^none|null|undefined|unknown|n\/a$/i.test(cleaned)) {
    return "";
  }
  return cleaned;
}

function textFromUnknown(value: unknown, max = 700): string {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map(String)
      .filter(Boolean)
      .slice(0, 12)
      .join(", ")
      .slice(0, max);
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

function firstUseful(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanExtractedValue(textFromUnknown(value, 1200));
    if (text) return text;
  }
  return "";
}

function firstDefined(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return undefined;
}

function moduleKey(source: string): string {
  const raw = (source || "unknown").trim();
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (/spiderfoot|publicosint/.test(normalized)) return "publicosint";
  if (normalized === "holehe") return "holehe";
  if (normalized === "maigret") return "maigret";
  if (normalized === "phoneexposure") return "phone-exposure";
  if (normalized === "phoneinfoga" || normalized === "phone")
    return "phoneinfoga";
  if (normalized === "osint") return "osint";
  return raw;
}

function moduleLabel(id: string): string {
  return MODULE_META[id]?.label || "Öffentlicher Schnellcheck";
}

function derivePayloadSource(
  data: Record<string, unknown>,
  fallback = "OSINT"
) {
  return (
    firstUseful(data.module, data.source, data.provider, fallback) || fallback
  );
}

function countryLabel(value: string): string {
  const v = cleanExtractedValue(value);
  if (!v) return "Nicht sicher bestimmbar";
  const normalized = v.toLowerCase();
  if (["de", "deu", "germany", "deutschland"].includes(normalized)) {
    return "Deutschland";
  }
  if (
    ["at", "aut", "austria", "österreich", "oesterreich"].includes(normalized)
  ) {
    return "Österreich";
  }
  if (["ch", "che", "switzerland", "schweiz"].includes(normalized)) {
    return "Schweiz";
  }
  return v;
}

function normalizeBoolText(value: unknown): "Ja" | "Nein" | "Nicht eindeutig" {
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  const text = String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();
  if (
    [
      "true",
      "valid",
      "ja",
      "yes",
      "1",
      "gültig",
      "gueltig",
      "active",
      "aktiv",
    ].includes(text)
  ) {
    return "Ja";
  }
  if (
    [
      "false",
      "invalid",
      "nein",
      "no",
      "0",
      "ungültig",
      "ungueltig",
      "inactive",
      "inaktiv",
    ].includes(text)
  ) {
    return "Nein";
  }
  return "Nicht eindeutig";
}

function pickPattern(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = cleanExtractedValue(match[1]);
      if (value) return value;
    }
  }
  return "";
}

function isPhoneMetadataFinding(
  raw: Record<string, unknown>,
  source: string
): boolean {
  const category = String(raw.category || "").toUpperCase();
  if (category === "PHONE_PUBLIC" || category === "STATUS") return false;
  if (category === "PHONE_METADATA") return true;

  return (
    /phoneinfoga|carrier|provider|rufnummer.?metadata/i.test(source) ||
    /telefon|rufnummer|telekommunikation/i.test(String(raw.title || "")) ||
    Boolean(
      raw.valid ||
      raw.is_valid ||
      raw.valid_number ||
      raw.isValid ||
      raw.carrier ||
      raw.country ||
      raw.country_code ||
      raw.provider
    )
  );
}

function buildPhoneMetadataFinding(
  raw: Record<string, unknown>,
  source: string
): DemoFinding {
  const details = asRecord(raw.details) || {};
  const combinedText = [
    raw.description,
    raw.detail,
    raw.raw,
    raw.raw_output,
    raw.output,
    raw.stdout,
    raw.data,
    raw,
  ]
    .map((value) => textFromUnknown(value, 2400))
    .filter(Boolean)
    .join("\n");

  const provider =
    firstUseful(details.carrier, raw.carrier, raw.provider, raw.operator) ||
    pickPattern(combinedText, [
      /"carrier"\s*:\s*"([^"]+)"/i,
      /"provider"\s*:\s*"([^"]+)"/i,
      /"operator"\s*:\s*"([^"]+)"/i,
      /carrier\s*[:=|]\s*([^|\n,}]+)/i,
      /provider\s*[:=|]\s*([^|\n,}]+)/i,
      /operator\s*[:=|]\s*([^|\n,}]+)/i,
      /anbieter\s*[:=|]\s*([^|\n,}]+)/i,
      /netzbetreiber\s*[:=|]\s*([^|\n,}]+)/i,
      /\b(T-Mobile|Telekom|Vodafone|O2|Telefonica|Telefónica|1&1|Drillisch|Congstar|Blau|Aldi Talk|Otelo|Klarmobil)\b/i,
    ]) ||
    "Nicht eindeutig zuordenbar";

  const country = countryLabel(
    firstUseful(
      details.country,
      raw.country,
      raw.country_code,
      raw.country_name,
      raw.region,
      details.region_code
    ) ||
      pickPattern(combinedText, [
        /"country"\s*:\s*"([^"]+)"/i,
        /"country_code"\s*:\s*"([^"]+)"/i,
        /"country_name"\s*:\s*"([^"]+)"/i,
        /country\s*[:=|]\s*([^|\n,}]+)/i,
        /country\s+code\s*[:=|]\s*([^|\n,}]+)/i,
        /country\s+name\s*[:=|]\s*([^|\n,}]+)/i,
        /region\s*[:=|]\s*([^|\n,}]+)/i,
        /land\s*[:=|]\s*([^|\n,}]+)/i,
      ])
  );

  const patternValid = pickPattern(combinedText, [
    /"valid"\s*:\s*(true|false|"true"|"false"|"valid"|"invalid")/i,
    /"is_valid"\s*:\s*(true|false|"true"|"false"|"valid"|"invalid")/i,
    /nummer\s+g[uü]ltig\s*[:=|]\s*(true|false|ja|nein|valid|invalid|g[uü]ltig|ung[uü]ltig)/i,
    /rufnummer\s+validiert\s*[:=|]\s*(ja|nein|true|false|valid|invalid)/i,
    /valid\s*[:=|]\s*(true|false|yes|no|valid|invalid)/i,
    /status\s*[:=|]\s*(valid|invalid|true|false|active|inactive|aktiv|inaktiv)/i,
  ]);

  const validRaw = firstDefined(
    details.valid,
    raw.valid,
    raw.is_valid,
    raw.valid_number,
    raw.isValid,
    patternValid,
    raw.status
  );

  const validLabel = normalizeBoolText(validRaw);
  const isValid = validLabel === "Ja";

  const numberFormat =
    firstUseful(
      details.international,
      details.e164,
      raw.international,
      raw.e164
    ) ||
    pickPattern(combinedText, [
      /international\s*[:=|]\s*([^|\n]+)/i,
      /format\s+e\.?164\s*[:=|]\s*([^|\n]+)/i,
    ]);

  const nationalFormat =
    firstUseful(details.national, raw.national) ||
    pickPattern(combinedText, [/national\s*[:=|]\s*([^|\n]+)/i]);

  const phoneType =
    firstUseful(details.type, raw.number_type, raw.phone_type) ||
    pickPattern(combinedText, [/nummerntyp\s*[:=|]\s*([^|\n]+)/i]);

  const timezone =
    firstUseful(details.timezones, raw.timezones, raw.timezone) ||
    pickPattern(combinedText, [/zeitzone\s*[:=|]\s*([^|\n]+)/i]);

  const hasProvider = provider !== "Nicht eindeutig zuordenbar";
  const hasCountry = country !== "Nicht sicher bestimmbar";
  const hasUsefulDetails = Boolean(
    isValid ||
    hasProvider ||
    hasCountry ||
    numberFormat ||
    nationalFormat ||
    phoneType ||
    timezone
  );

  const detailLines = [
    "Status: Technische Zusatzinformationen zur eingegebenen Rufnummer wurden ausgewertet.",
    ...(numberFormat ? [`Format: ${numberFormat}`] : []),
    ...(nationalFormat ? [`National: ${nationalFormat}`] : []),
    `Rufnummer validiert: ${validLabel}`,
    ...(phoneType ? [`Nummerntyp: ${phoneType}`] : []),
    `Netzbetreiber: ${provider}`,
    `Regionale Zuordnung: ${country}`,
    ...(timezone ? [`Zeitzone: ${timezone}`] : []),
    hasUsefulDetails
      ? "Bewertung: Diese Angaben sind technische Zusatzinformationen und keine öffentliche Fundstelle."
      : "Bewertung: Es konnten keine eindeutigen technischen Detailangaben bestätigt werden.",
  ];

  return {
    category: "PHONE_METADATA",
    title: "Technische Rufnummernprüfung",
    description: detailLines.join("\n"),
    platform: hasProvider ? provider : "Technische Zusatzprüfung",
    detail: detailLines.join("\n"),
    risk: String(raw.risk || "low").toLowerCase(),
    confidence:
      typeof raw.confidence === "number"
        ? raw.confidence
        : hasUsefulDetails
          ? 70
          : 45,
    source: "phoneinfoga",
  };
}

function buildPublicPhoneFinding(
  raw: Record<string, unknown>,
  source: string
): DemoFinding {
  const url = typeof raw.url === "string" ? raw.url : undefined;
  const platform =
    firstUseful(raw.platform, raw.domain) || "Öffentliche Webseite";
  const snippet = firstUseful(raw.snippet, raw.content);
  const description =
    firstUseful(raw.description) ||
    "Diese Rufnummer wurde unter anderem auf einer öffentlich indexierten Seite gefunden.";

  return {
    category: "PHONE_PUBLIC",
    title: firstUseful(raw.title) || `Öffentliche Fundstelle · ${platform}`,
    description,
    platform,
    detail: snippet || url || description,
    risk: String(raw.risk || "medium").toLowerCase(),
    confidence: typeof raw.confidence === "number" ? raw.confidence : 70,
    source: moduleKey(source) === "phone-exposure" ? "phone-exposure" : source,
    url,
  };
}

export function findingFromUpstream(
  raw: Record<string, unknown>,
  fallbackSource: string
): DemoFinding | null {
  const source = String(
    raw.source || raw.module || raw.provider || fallbackSource || "unknown"
  );
  const category = String(raw.category || "").toUpperCase();

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

  if (category === "PHONE_PUBLIC") {
    return buildPublicPhoneFinding(raw, source);
  }

  if (category === "STATUS") {
    return {
      category: "STATUS",
      title: firstUseful(raw.title) || "Prüfstatus",
      description: firstUseful(raw.description, raw.message),
      platform: moduleLabel(moduleKey(source)),
      detail: firstUseful(raw.detail, raw.description, raw.message),
      risk: "low",
      confidence: 0,
      source,
    };
  }

  if (isPhoneMetadataFinding(raw, source)) {
    return buildPhoneMetadataFinding(raw, source);
  }

  const platform = String(
    raw.platform ||
      raw.type ||
      raw.service ||
      raw.country ||
      moduleLabel(moduleKey(source))
  );
  const url = typeof raw.url === "string" ? raw.url : undefined;
  const rawText = firstUseful(
    raw.raw,
    raw.raw_output,
    raw.output,
    raw.stdout,
    raw.data
  );
  const status = safeString(raw.status);

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
      description ||
      "Die öffentliche Korrelation wurde ausgelöst. Detaildaten folgen.";
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
  const out: Array<{ raw: Record<string, unknown>; fallbackSource: string }> =
    [];

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

  if (data.partial === true) {
    const scanMeta = asRecord(data.scan_meta);
    const statusSource =
      scanMeta?.scope === "prioritised_public_web"
        ? "phone-exposure"
        : fallbackSource;
    const notices = asArray(data.notices).map(safeString).filter(Boolean);

    for (const notice of notices) {
      out.push({
        raw: {
          source: statusSource,
          category: "STATUS",
          title: "Öffentliche Suche teilweise eingeschränkt",
          description: notice,
          risk: "low",
          confidence: 0,
        },
        fallbackSource: statusSource,
      });
    }
  }

  if (out.length === 0) {
    const total = Number(
      data.total_findings ?? data.result_count ?? data.count ?? 0
    );
    const hasSummary = Boolean(
      safeString(data.summary) || safeString(data.message)
    );
    const rawPayload = firstUseful(data.raw_output, data.output, data.stdout);
    const hasRaw = Boolean(rawPayload);
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
            rawPayload ||
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
    const hasTechnical = m.findings.some(
      (finding) => finding.category === "PHONE_METADATA"
    );
    const hasStatus = m.findings.some(
      (finding) => finding.category === "STATUS"
    );

    if (m.status === "error") return `${m.label}: Fehler`;
    if (m.status === "started") return `${m.label}: gestartet`;
    if (m.count === 0 && hasTechnical) {
      return `${m.label}: technische Zusatzdaten vorhanden`;
    }
    if (m.id === "phone-exposure" && m.count === 0 && hasStatus) {
      return `${m.label}: keine bestätigte Fundstelle, teilweise eingeschränkt`;
    }
    if (m.count === 0)
      return `${m.label}: keine bestätigten öffentlichen Treffer`;
    return `${m.label}: ${m.count} Treffer`;
  });
  return parts.join(" · ");
}

export function groupModules(findings: DemoFinding[]): DemoModuleResult[] {
  const buckets = new Map<string, DemoFinding[]>();
  for (const finding of findings) {
    const id = moduleKey(finding.source || finding.platform || "unknown");
    const list = buckets.get(id) || [];
    list.push(finding);
    buckets.set(id, list);
  }

  const modules: DemoModuleResult[] = [...buckets.entries()].map(
    ([id, items]) => {
      const errors = items.filter((item) => item.category === "ERROR");
      const started = items.some((item) =>
        /gestartet|started/i.test(item.title)
      );
      const real = items.filter((item) => item.category !== "ERROR");
      const hasTechnical = real.some(
        (item) => item.category === "PHONE_METADATA"
      );
      const hasStatus = real.some((item) => item.category === "STATUS");
      let status: DemoModuleResult["status"] = "ok";
      if (errors.length && real.length === 0) status = "error";
      else if (
        started &&
        real.every((item) => /gestartet|started/i.test(item.title))
      ) {
        status = "started";
      } else if (real.length === 0) status = "empty";

      const count = real.filter(
        (item) =>
          !/gestartet|started/i.test(item.title) &&
          item.category !== "STATUS" &&
          item.category !== "EMPTY" &&
          item.category !== "PHONE_METADATA"
      ).length;

      let summary = `${count} öffentliche Signal(e)`;
      if (status === "error") {
        summary = errors[0]?.description || "Prüfschritt nicht verfügbar";
      } else if (status === "started") {
        summary = "Prüfung gestartet — Detaildaten ausstehend";
      } else if (count === 0 && hasTechnical) {
        summary =
          "Keine öffentliche Fundstelle; technische Zusatzprüfung vorhanden";
      } else if (count === 0 && hasStatus) {
        summary =
          "Keine bestätigte Fundstelle; Prüfung teilweise eingeschränkt";
      } else if (count === 0) {
        summary = "Keine öffentlichen Treffer in diesem Prüfschritt";
      }

      return {
        id,
        label: moduleLabel(id),
        status,
        findings: items,
        count,
        summary,
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
  let partialNotice = "";

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
    if (data.partial === true && !partialNotice) {
      partialNotice = asArray(data.notices).map(safeString).find(Boolean) || "";
    }

    for (const { raw, fallbackSource } of collectFindingObjects(data)) {
      const mapped = findingFromUpstream(raw, fallbackSource);
      if (mapped) findings.push(mapped);
    }
  }

  const scoredFindings = filterScoreFindings(findings);
  const primaryFindings = scoredFindings.length
    ? scoredFindings
    : findings.filter((finding) => finding.category !== "ERROR");
  const supplementalFindings = findings.filter(
    (finding) =>
      finding.category === "STATUS" || finding.category === "PHONE_METADATA"
  );
  const displayFindings = [...primaryFindings];
  for (const finding of supplementalFindings) {
    if (!displayFindings.includes(finding)) displayFindings.push(finding);
  }

  const modules = groupModules(displayFindings);
  const computed = computeDemoExposureScore(scoredFindings);
  const score =
    computed.usableCount > 0 ? computed.score : (upstreamScore ?? 0);
  const risk =
    computed.usableCount > 0 ? computed.risk : upstreamRisk || "Niedrig";
  const platforms = [
    ...new Set(
      displayFindings
        .filter((finding) => finding.category !== "STATUS")
        .map((finding) => finding.platform || finding.source || "")
        .filter(Boolean)
        .map(String)
    ),
  ].slice(0, 16);

  const noHitSummary = partialNotice
    ? `Keine bestätigten öffentlichen Treffer für „${queryLabel}“. ${partialNotice}`
    : `Keine öffentlichen Treffer für „${queryLabel}“ in den aktiven Prüfschritten.`;

  const summary =
    scoredFindings.length === 0
      ? upstreamSummary || noHitSummary
      : upstreamSummary && upstreamSummary.length < 420
        ? upstreamSummary
        : `Schnellcheck für „${queryLabel}": ${buildModuleSummaries(modules)}. Exposure-Score ${score}/100 (${risk}).`;

  return {
    status: "success",
    query: queryLabel,
    queries,
    queryType: Object.keys(queries).join("+") || "mixed",
    findings: displayFindings,
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
