import { NextResponse } from "next/server";
import {
  COMMUNICATION_RATE_LIMIT,
  rateLimitHeaders,
  recordRateLimitAttempt,
} from "@/lib/security/rate-limit";
import { getClientIp, validateMutationOrigin } from "@/lib/security/request";
import { getDemoScanCache, setDemoScanCache } from "@/lib/demo/scan-cache";

const DEMO_SCAN_API_URL =
  process.env.DEMO_SCAN_API_URL || "http://161.97.85.22:5000/api/scan";
const DEMO_SCAN_TIMEOUT_MS = Number(process.env.DEMO_SCAN_TIMEOUT_MS || 35_000);
const MAX_QUERY_LENGTH = 120;

const DEMO_SCAN_RATE_LIMIT = {
  ...COMMUNICATION_RATE_LIMIT,
  limit: 8,
  windowMs: 60 * 60_000,
  blockMs: 30 * 60_000,
};

function normalizeQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) return null;
  return query;
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
    const body = await req.json().catch(() => null);
    const query = normalizeQuery(body?.query);
    if (!query) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Bitte geben Sie eine gültige E-Mail, einen Benutzernamen oder Namen ein.",
          risk_level: "Fehler",
        },
        { status: 400, headers: rateLimitHeaders(attempt) }
      );
    }

    const cached = getDemoScanCache(query);
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
      const contaboResponse = await fetch(DEMO_SCAN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!contaboResponse.ok) {
        throw new Error(`Demo scan upstream error: ${contaboResponse.status}`);
      }

      const data = await contaboResponse.json();
      if (data?.status === "success") {
        setDemoScanCache(query, data);
      }

      return NextResponse.json(data, {
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
    return NextResponse.json(
      {
        status: "error",
        message: "Der interne Analyse-Server konnte nicht erreicht werden.",
        risk_level: "Fehler",
      },
      { status: 500, headers: rateLimitHeaders(attempt) }
    );
  }
}
