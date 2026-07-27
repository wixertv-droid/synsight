import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import type { KiServerStatusPayload } from "@/lib/admin/ki-server-status";
import { getReverseImageModuleSettings } from "@/lib/analysis/reverse-image/settings";

export const dynamic = "force-dynamic";

function resolveStatusUrl(compareUrl: string): string {
  const fromEnv = process.env.KI_SERVER_STATUS_URL?.trim();
  if (fromEnv) return fromEnv;

  try {
    const url = new URL(compareUrl);
    url.pathname = "/status";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "http://161.97.85.22:8000/status";
  }
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET() {
  const access = await getAdminAccess();
  if (!access.granted) {
    return NextResponse.json(
      apiError(
        access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        access.status === 401
          ? "Sie müssen angemeldet sein."
          : "Administratorrechte erforderlich."
      ),
      { status: access.status }
    );
  }

  let sourceUrl = "http://161.97.85.22:8000/status";
  try {
    const settings = await getReverseImageModuleSettings();
    sourceUrl = resolveStatusUrl(settings.compareUrl);
  } catch {
    /* use default */
  }

  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const payload: KiServerStatusPayload = {
        online: false,
        status: "offline",
        aiEngine: "unreachable",
        activeTasks: 0,
        uptimeSeconds: 0,
        checkedAt,
        sourceUrl,
        error: `HTTP ${response.status}`,
      };
      return NextResponse.json(apiSuccess(payload), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const body = (await response.json()) as {
      status?: unknown;
      ai_engine?: unknown;
      active_tasks?: unknown;
      uptime_seconds?: unknown;
    };

    const status =
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim().toLowerCase()
        : "unknown";
    const online = status === "online";

    const payload: KiServerStatusPayload = {
      online,
      status,
      aiEngine:
        typeof body.ai_engine === "string" && body.ai_engine.trim()
          ? body.ai_engine.trim()
          : "unknown",
      activeTasks: Math.max(0, asFiniteNumber(body.active_tasks, 0)),
      uptimeSeconds: Math.max(0, asFiniteNumber(body.uptime_seconds, 0)),
      checkedAt,
      sourceUrl,
      error: null,
    };

    return NextResponse.json(apiSuccess(payload), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KI-Server nicht erreichbar";
    const payload: KiServerStatusPayload = {
      online: false,
      status: "offline",
      aiEngine: "unreachable",
      activeTasks: 0,
      uptimeSeconds: 0,
      checkedAt,
      sourceUrl,
      error: message,
    };
    return NextResponse.json(apiSuccess(payload), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
