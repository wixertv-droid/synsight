import { NextResponse } from "next/server";
import {
  COMMUNICATION_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { normalizeUpstreamPayload } from "@/lib/demo/normalize-upstream";
import { resolveDemoScanCredentials } from "@/lib/demo/demo-scan-credentials";

/** One module step — keep under nginx proxy_read_timeout. */
const DEMO_SCAN_STEP_TIMEOUT_MS = Number(
  process.env.DEMO_SCAN_STEP_TIMEOUT_MS || 75_000
);

const DEMO_SCAN_RATE_LIMIT = {
  ...COMMUNICATION_RATE_LIMIT,
  limit: 40,
  windowMs: 60 * 60_000,
  blockMs: 15 * 60_000,
};

const ALLOWED_MODULES = new Set([
  "holehe",
  "maigret",
  "phoneinfoga",
  "theHarvester",
  "photon",
  "spiderfoot",
]);

function cleanQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length < 2 || query.length > 160) return null;
  return query;
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

/**
 * Sequential module step:
 *   { query, module: "holehe"|"maigret"|… }
 */
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
    const query = cleanQuery(body?.query);
    const moduleRaw =
      typeof body?.module === "string" ? body.module.trim() : "";
    const scanModule = moduleRaw === "SpiderFoot" ? "spiderfoot" : moduleRaw;

    if (!query) {
      return NextResponse.json(
        {
          status: "error",
          message: "query fehlt.",
          risk_level: "Fehler",
        },
        { status: 400, headers: rateLimitHeaders(attempt) }
      );
    }
    if (!scanModule || !ALLOWED_MODULES.has(scanModule)) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "module fehlt oder ungültig. Erlaubt: holehe, maigret, phoneinfoga, theHarvester, photon, spiderfoot.",
          risk_level: "Fehler",
        },
        { status: 400, headers: rateLimitHeaders(attempt) }
      );
    }

    const creds = await resolveDemoScanCredentials();
    if (!creds?.url) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "DemoScanner ist nicht konfiguriert (Admin → Website → APIs).",
          risk_level: "Fehler",
        },
        { status: 503, headers: rateLimitHeaders(attempt) }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      DEMO_SCAN_STEP_TIMEOUT_MS
    );

    try {
      const contaboResponse = await fetch(creds.url, {
        method: "POST",
        headers: authHeaders(creds.apiKey),
        body: JSON.stringify({ query, module: scanModule }),
        signal: controller.signal,
      });

      const text = await contaboResponse.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      } catch {
        data = null;
      }

      // Legacy Contabo without module= support: retry with {query} only
      // (auto-detects tool). Tag findings with requested module when possible.
      if (
        contaboResponse.status === 400 &&
        data &&
        /missing query|unknown module/i.test(
          String(data.error || data.message || "")
        ) === false &&
        !Array.isArray(data.findings)
      ) {
        // fall through to error below
      }

      if (
        !contaboResponse.ok &&
        contaboResponse.status === 400 &&
        /module/i.test(String(data?.error || data?.message || text))
      ) {
        // retry legacy
        const legacy = await fetch(creds.url, {
          method: "POST",
          headers: authHeaders(creds.apiKey),
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        const legacyText = await legacy.text();
        try {
          data = legacyText
            ? (JSON.parse(legacyText) as Record<string, unknown>)
            : null;
        } catch {
          data = null;
        }
        if (!legacy.ok || !data) {
          return NextResponse.json(
            {
              status: "error",
              message:
                (typeof data?.error === "string" && data.error) ||
                (typeof data?.message === "string" && data.message) ||
                `Contabo HTTP ${legacy.status}`,
              risk_level: "Fehler",
              module: scanModule,
            },
            {
              status: legacy.status >= 500 ? 502 : legacy.status,
              headers: rateLimitHeaders(attempt),
            }
          );
        }
      } else if (!contaboResponse.ok || !data) {
        return NextResponse.json(
          {
            status: "error",
            message:
              (typeof data?.error === "string" && data.error) ||
              (typeof data?.message === "string" && data.message) ||
              (text.trim().startsWith("<")
                ? `Proxy/Timeout HTML HTTP ${contaboResponse.status}`
                : `Contabo HTTP ${contaboResponse.status}`),
            risk_level: "Fehler",
            module: scanModule,
          },
          {
            status:
              contaboResponse.status >= 500 ? 502 : contaboResponse.status,
            headers: rateLimitHeaders(attempt),
          }
        );
      }

      const normalized = normalizeUpstreamPayload({
        payloads: [data],
        queries: { [scanModule]: query },
      });

      return NextResponse.json(
        {
          ...normalized,
          module: scanModule,
          query,
          step: true,
        },
        { headers: rateLimitHeaders(attempt) }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[demo-scan-step] failed:", error);
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || /aborted/i.test(error.message));
    return NextResponse.json(
      {
        status: "error",
        message: aborted
          ? "Modul-Timeout — Schritt übersprungen / erneut versuchen."
          : error instanceof Error
            ? error.message
            : "Modul-Scan fehlgeschlagen.",
        risk_level: "Fehler",
      },
      { status: aborted ? 504 : 502, headers: rateLimitHeaders(attempt) }
    );
  }
}
