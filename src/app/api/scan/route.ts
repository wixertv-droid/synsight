import { NextResponse } from "next/server";
import {
  COMMUNICATION_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { getDemoScanCache, setDemoScanCache } from "@/lib/demo/scan-cache";
import { normalizeUpstreamPayload } from "@/lib/demo/normalize-upstream";

const DEMO_SCAN_API_URL =
  process.env.DEMO_SCAN_API_URL || "http://161.97.85.22:5000/api/scan";
/** Contabo tools can take minutes (holehe/maigret). */
const DEMO_SCAN_TIMEOUT_MS = Number(
  process.env.DEMO_SCAN_TIMEOUT_MS || 320_000
);
/** Contabo Bearer key — override in .env.production */
const DEMO_SCAN_API_KEY =
  process.env.DEMO_SCAN_API_KEY || "demoscanner23061980!!";
const MAX_FIELD_LENGTH = 160;

const DEMO_SCAN_RATE_LIMIT = {
  ...COMMUNICATION_RATE_LIMIT,
  limit: 6,
  windowMs: 60 * 60_000,
  blockMs: 30 * 60_000,
};

const FIELD_KEYS = [
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

  for (const key of FIELD_KEYS) {
    const value = cleanField(body[key]);
    if (value) out[key] = value;
  }

  // Legacy single-query support
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

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (DEMO_SCAN_API_KEY) {
    headers.Authorization = `Bearer ${DEMO_SCAN_API_KEY}`;
  }
  return headers;
}

async function parseContaboResponse(
  contaboResponse: Response
): Promise<Record<string, unknown>> {
  const data = (await contaboResponse.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!contaboResponse.ok) {
    const upstreamMessage =
      typeof data?.message === "string" && data.message.trim()
        ? data.message.trim()
        : typeof data?.error === "string"
          ? data.error
          : `Demo scan upstream error: ${contaboResponse.status}`;
    const err = new Error(upstreamMessage) as Error & { status?: number };
    err.status = contaboResponse.status;
    throw err;
  }

  if (!data) {
    throw new Error("Leere Antwort vom Analyse-Server.");
  }

  return data;
}

async function callContaboScan(
  body: Record<string, string>,
  signal: AbortSignal
): Promise<Record<string, unknown>> {
  const contaboResponse = await fetch(DEMO_SCAN_API_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    signal,
  });
  return parseContaboResponse(contaboResponse);
}

async function fetchUpstreamPayloads(
  queries: Record<string, string>,
  signal: AbortSignal
): Promise<Array<Record<string, unknown>>> {
  // Prefer single multi-field call (contabo-deep-2). Fall back to legacy
  // one-query-per-request API when Contabo still expects `{ query }`.
  try {
    const multi = await callContaboScan(queries, signal);
    return [multi];
  } catch (error) {
    const status =
      error instanceof Error && "status" in error
        ? Number((error as Error & { status?: number }).status)
        : 0;
    const message = error instanceof Error ? error.message : "";
    const legacyShape =
      status === 400 || /missing query|unauthorized/i.test(message);
    if (!legacyShape) throw error;
  }

  const values = Object.values(queries);
  return Promise.all(values.map((query) => callContaboScan({ query }, signal)));
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEMO_SCAN_TIMEOUT_MS);

    try {
      const payloads = await fetchUpstreamPayloads(queries, controller.signal);
      const normalized = normalizeUpstreamPayload({ payloads, queries });
      setDemoScanCache(cacheKey, normalized);

      return NextResponse.json(normalized, {
        headers: {
          ...rateLimitHeaders(attempt),
          "x-demo-scan-cache": "miss",
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
          ? "Die Analyse hat zu lange gedauert. Bitte erneut versuchen."
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
