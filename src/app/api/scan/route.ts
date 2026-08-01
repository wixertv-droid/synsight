import { NextResponse } from "next/server";
import {
  COMMUNICATION_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { getDemoScanCache, setDemoScanCache } from "@/lib/demo/scan-cache";
import { normalizeUpstreamPayload } from "@/lib/demo/normalize-upstream";
import { resolveDemoScanCredentials } from "@/lib/demo/demo-scan-credentials";

/**
 * Stay under typical nginx proxy_read_timeout (60–120s) so the client
 * gets JSON instead of an HTML 504 page. Override via env if nginx is raised.
 */
const DEMO_SCAN_TIMEOUT_MS = Number(
  process.env.DEMO_SCAN_TIMEOUT_MS || 110_000
);
const DEMO_SCAN_PER_FIELD_MS = Number(
  process.env.DEMO_SCAN_PER_FIELD_MS || 50_000
);
const MAX_FIELD_LENGTH = 160;

const DEMO_SCAN_RATE_LIMIT = {
  ...COMMUNICATION_RATE_LIMIT,
  limit: 6,
  windowMs: 60 * 60_000,
  blockMs: 30 * 60_000,
};

/** Prefer faster / higher-signal Contabo modules first. */
const FIELD_PRIORITY = [
  "email",
  "username",
  "phone",
  "domain",
  "url",
  "name",
] as const;

function cleanField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length < 2 || query.length > MAX_FIELD_LENGTH) return null;
  return query;
}

function extractQueries(
  body: Record<string, unknown> | null
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!body) return out;

  for (const key of FIELD_PRIORITY) {
    const value = cleanField(body[key]);
    if (value) out[key] = value;
  }

  const legacy = cleanField(body.query);
  if (legacy && Object.keys(out).length === 0) {
    if (legacy.includes("@")) out.email = legacy;
    else if (legacy.startsWith("+") || /^\d[\d\s()-]{6,}$/.test(legacy))
      out.phone = legacy;
    else if (/^https?:\/\//i.test(legacy)) out.url = legacy;
    else if (legacy.includes(".") && !legacy.includes(" ")) out.domain = legacy;
    else out.username = legacy;
  }

  return out;
}

function cacheKeyForQueries(queries: Record<string, string>): string {
  return Object.entries(queries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v.toLowerCase()}`)
    .join("|");
}

function authHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

async function parseContaboResponse(
  contaboResponse: Response
): Promise<Record<string, unknown>> {
  const text = await contaboResponse.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = null;
  }

  if (!contaboResponse.ok) {
    const upstreamMessage =
      typeof data?.message === "string" && data.message.trim()
        ? data.message.trim()
        : typeof data?.error === "string"
          ? data.error
          : text.trim().startsWith("<")
            ? `Contabo/Proxy HTML-Fehler HTTP ${contaboResponse.status} (Timeout?).`
            : `Demo scan upstream error: ${contaboResponse.status}`;
    const err = new Error(upstreamMessage) as Error & { status?: number };
    err.status = contaboResponse.status;
    throw err;
  }

  if (!data) {
    throw new Error("Leere oder ungültige Antwort vom Analyse-Server.");
  }

  return data;
}

async function callContaboScan(
  scanUrl: string,
  apiKey: string,
  body: Record<string, string>,
  signal: AbortSignal
): Promise<Record<string, unknown>> {
  const contaboResponse = await fetch(scanUrl, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
    signal,
  });
  return parseContaboResponse(contaboResponse);
}

function orderedQueries(queries: Record<string, string>): string[] {
  const ordered: string[] = [];
  for (const key of FIELD_PRIORITY) {
    if (queries[key]) ordered.push(queries[key]);
  }
  for (const value of Object.values(queries)) {
    if (!ordered.includes(value)) ordered.push(value);
  }
  return ordered;
}

async function fetchUpstreamPayloads(
  scanUrl: string,
  apiKey: string,
  queries: Record<string, string>,
  parentSignal: AbortSignal
): Promise<{ payloads: Array<Record<string, unknown>>; partial: boolean }> {
  // Prefer single multi-field call (contabo-deep-2).
  try {
    const multi = await callContaboScan(scanUrl, apiKey, queries, parentSignal);
    return { payloads: [multi], partial: false };
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? Number((error as Error & { status?: number }).status)
        : 0;
    const message = error instanceof Error ? error.message : "";
    const legacyShape = status === 400 || /missing query/i.test(message);
    if (!legacyShape) throw error;
  }

  // Legacy Contabo api.py: one {query} per call.
  // Sequential (not parallel) — parallel 5× maigret/holehe blows nginx timeouts.
  const payloads: Array<Record<string, unknown>> = [];
  const values = orderedQueries(queries);
  const started = Date.now();
  let abortedEarly = false;

  for (const query of values) {
    if (parentSignal.aborted) {
      abortedEarly = true;
      break;
    }
    const elapsed = Date.now() - started;
    const left = DEMO_SCAN_TIMEOUT_MS - elapsed;
    if (left < 4_000) {
      abortedEarly = true;
      break;
    }

    const fieldMs = Math.min(DEMO_SCAN_PER_FIELD_MS, left);
    const fieldController = new AbortController();
    const timer = setTimeout(() => fieldController.abort(), fieldMs);
    const onParentAbort = () => fieldController.abort();
    parentSignal.addEventListener("abort", onParentAbort);

    try {
      const payload = await callContaboScan(
        scanUrl,
        apiKey,
        { query },
        fieldController.signal
      );
      payloads.push(payload);
    } catch (error) {
      console.error(
        "[demo-scan] field failed:",
        query,
        error instanceof Error ? error.message : error
      );
    } finally {
      clearTimeout(timer);
      parentSignal.removeEventListener("abort", onParentAbort);
    }
  }

  if (payloads.length === 0) {
    throw new Error(
      "Kein Contabo-Modul hat rechtzeitig geantwortet. " +
        "Tipp: nur 1–2 Felder scannen, Contabo-Timeouts senken, oder auf SynSight " +
        "nginx proxy_read_timeout für /api/scan auf 300s setzen."
    );
  }

  return {
    payloads,
    partial: abortedEarly || payloads.length < values.length,
  };
}

export async function POST(req: Request) {
  const csrfError = validateMutationOrigin(req);
  if (csrfError) return csrfError;

  const ipAddress = getClientIp(req);
  const attempt = recordRateLimitAttempt(
    `demo-scan:${ipAddress}`,
    DEMO_SCAN_RATE_LIMIT
  );
  if (!attempt.allowed) {
    return NextResponse.json(
      {
        status: "error",
        message: "Zu viele Scans. Bitte versuchen Sie es später erneut.",
        risk_level: "Fehler",
      },
      { status: 429, headers: rateLimitHeaders(attempt) }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const queries = extractQueries(body);

    if (Object.keys(queries).length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Bitte mindestens ein Feld ausfüllen (E-Mail, Username, Telefon, Domain oder URL).",
          risk_level: "Fehler",
        },
        { status: 400, headers: rateLimitHeaders(attempt) }
      );
    }

    const cacheKey = cacheKeyForQueries(queries);
    const cached = getDemoScanCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          ...rateLimitHeaders(attempt),
          "x-demo-scan-cache": "hit",
        },
      });
    }

    const creds = await resolveDemoScanCredentials();
    if (!creds?.url) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "DemoScanner ist nicht konfiguriert. Bitte unter Admin → Website → APIs Contabo DemoScanner hinterlegen.",
          risk_level: "Fehler",
        },
        { status: 503, headers: rateLimitHeaders(attempt) }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEMO_SCAN_TIMEOUT_MS);

    try {
      const { payloads, partial } = await fetchUpstreamPayloads(
        creds.url,
        creds.apiKey,
        queries,
        controller.signal
      );
      const normalized = normalizeUpstreamPayload({ payloads, queries });
      if (partial) {
        normalized.summary = `${normalized.summary} (Teil-Ergebnis — Zeitbudget erreicht; weitere Module ggf. weggelassen.)`;
      }
      setDemoScanCache(cacheKey, normalized);

      return NextResponse.json(normalized, {
        headers: {
          ...rateLimitHeaders(attempt),
          "x-demo-scan-cache": "miss",
          "x-demo-scan-partial": partial ? "1" : "0",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[demo-scan] failed:", error);
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || /aborted/i.test(error.message));
    const message =
      error instanceof Error && error.message && !aborted
        ? error.message
        : aborted
          ? "Die Analyse hat zu lange gedauert (Proxy-/Contabo-Timeout). Bitte nur E-Mail oder Username testen, oder nginx proxy_read_timeout erhöhen."
          : "Der interne Analyse-Server konnte nicht erreicht werden.";

    return NextResponse.json(
      {
        status: "error",
        message,
        risk_level: "Fehler",
      },
      { status: aborted ? 504 : 502, headers: rateLimitHeaders(attempt) }
    );
  }
}
