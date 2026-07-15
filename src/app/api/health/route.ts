import { NextResponse } from "next/server";
import { getDatabaseHealth } from "@/lib/database/client";
import { validateEnvironment } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const environment = validateEnvironment();
  const database = await getDatabaseHealth();
  const healthy =
    environment.valid && (!database.configured || database.reachable);

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: {
        environment: environment.valid ? "ok" : "invalid",
        database: database.configured
          ? database.reachable
            ? "ok"
            : "unreachable"
          : "not_configured",
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
