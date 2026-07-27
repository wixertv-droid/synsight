import { NextResponse } from "next/server";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminAccess } from "@/lib/admin/access";
import type { KiServerStatusPayload } from "@/lib/admin/ki-server-status";
import { getReverseImageModuleSettings } from "@/lib/analysis/reverse-image/settings";
import { getInsightFaceActiveTasks } from "@/lib/analysis/reverse-image/insightface-client";

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

/** Remote-/status-Felder — Server-Implementierungen variieren. */
function readRemoteActiveTasks(body: Record<string, unknown>): number {
  const candidates = [
    body.active_tasks,
    body.activeTasks,
    body.tasks,
    body.in_flight,
    body.inflight,
    body.busy,
    body.queue_size,
    body.queue,
    body.load,
  ];
  let best = 0;
  for (const value of candidates) {
    best = Math.max(best, Math.max(0, asFiniteNumber(value, 0)));
  }
  return best;
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
  const localTasks = getInsightFaceActiveTasks();

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const payload: KiServerStatusPayload = {
        online: localTasks > 0,
        status: localTasks > 0 ? "online" : "offline",
        aiEngine: "unreachable",
        activeTasks: localTasks,
        uptimeSeconds: 0,
        checkedAt,
        sourceUrl,
        error: `HTTP ${response.status}`,
      };
      return NextResponse.json(apiSuccess(payload), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const body = (await response.json()) as Record<string, unknown>;

    const status =
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim().toLowerCase()
        : "unknown";
    const online = status === "online" || localTasks > 0;
    const remoteTasks = readRemoteActiveTasks(body);

    const payload: KiServerStatusPayload = {
      online,
      status,
      aiEngine:
        typeof body.ai_engine === "string" && body.ai_engine.trim()
          ? body.ai_engine.trim()
          : typeof body.aiEngine === "string" && body.aiEngine.trim()
            ? body.aiEngine.trim()
            : "unknown",
      // Remote liefert oft dauerhaft 0 — lokale In-Flight-Vergleiche mitzählen
      activeTasks: Math.max(remoteTasks, localTasks),
      uptimeSeconds: Math.max(
        0,
        asFiniteNumber(body.uptime_seconds ?? body.uptimeSeconds, 0)
      ),
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
      online: localTasks > 0,
      status: localTasks > 0 ? "online" : "offline",
      aiEngine: "unreachable",
      activeTasks: localTasks,
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
