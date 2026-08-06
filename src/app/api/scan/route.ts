import { NextResponse } from "next/server";
import {
  COMMUNICATION_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { normalizeUpstreamPayload } from "@/lib/demo/normalize-upstream";
import { resolveDemoScanCredentials } from "@/lib/demo/demo-scan-credentials";

/** One public scan step — keep under nginx proxy_read_timeout. */
const DEMO_SCAN_STEP_TIMEOUT_MS = Number(
  process.env.DEMO_SCAN_STEP_TIMEOUT_MS || 75_000
);

const DEMO_SCAN_RATE_LIMIT = {
  ...COMMUNICATION_RATE_LIMIT,
  limit: 12,
  windowMs: 60 * 60_000,
  blockMs: 60 * 60_000,
};

/** Public/free DemoScanner: only the fast modules are allowed internally. */
const ALLOWED_MODULES = new Set(["holehe", "maigret", "phoneinfoga"]);

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

function upstreamErrorMessage(
  status: number,
  data: Record<string, unknown> | null,
  text = ""
): string {
  const upstreamMessage =
    (typeof data?.error === "string" && data.error) ||
    (typeof data?.message === "string" && data.message) ||
    "";
  if (upstreamMessage) return upstreamMessage;
  if (text.trim().startsWith("<")) return `Proxy/Timeout HTML HTTP ${status}`;
  return `Scanner HTTP ${status}`;
}

/**
 * Sequential public scan step.
 * Visible UI texts are neutral; internal module names are never displayed.
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
    const scanModule = moduleRaw;

    if (!query) {
      return NextResponse.json(
        {
          status: "error",
          message: "Zielwert fehlt oder ist ungültig.",
          risk_level: "Fehler",
        },
        { status: 400, headers: rateLimitHeaders(attempt) }
      );
    }
    if (!scanModule || !ALLOWED_MODULES.has(scanModule)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Dieser öffentliche Prüfschritt ist nicht freigegeben.",
          risk_level: "Fehler",
        },
        { status: 400, headers: rateLimitHeaders(attempt) }
      );
    }

    const creds = await resolveDemoScanCredentials();
    if (!creds?.url || !creds.apiKey) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "DemoScanner ist nicht vollständig konfiguriert (Admin → Website → APIs).",
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
      const upstreamResponse = await fetch(creds.url, {
        method: "POST",
        headers: authHeaders(creds.apiKey),
        body: JSON.stringify({ query, module: scanModule }),
        signal: controller.signal,
      });

      const text = await upstreamResponse.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      } catch {
        data = null;
      }

      if (
        !upstreamResponse.ok &&
        upstreamResponse.status === 400 &&
        /module/i.test(String(data?.error || data?.message || text))
      ) {
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
              message: upstreamErrorMessage(legacy.status, data, legacyText),
              risk_level: "Fehler",
              module: scanModule,
            },
            {
              status: legacy.status >= 500 ? 502 : legacy.status,
              headers: rateLimitHeaders(attempt),
            }
          );
        }
      } else if (!upstreamResponse.ok || !data) {
        return NextResponse.json(
          {
            status: "error",
            message: upstreamErrorMessage(upstreamResponse.status, data, text),
            risk_level: "Fehler",
            module: scanModule,
          },
          {
            status:
              upstreamResponse.status >= 500 ? 502 : upstreamResponse.status,
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
          ? "Der Prüfschritt hat zu lange gedauert und wurde übersprungen."
          : error instanceof Error
            ? error.message
            : "Prüfschritt fehlgeschlagen.",
        risk_level: "Fehler",
      },
      { status: aborted ? 504 : 502, headers: rateLimitHeaders(attempt) }
    );
  }
}
