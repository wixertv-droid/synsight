import { NextResponse } from "next/server";
import { getDatabaseHealth } from "@/lib/database/client";
import { isDatabaseRequired, validateEnvironment } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const environment = validateEnvironment();
  const database = await getDatabaseHealth();
  const databaseRequired = isDatabaseRequired();

  const databaseOk = databaseRequired
    ? database.configured && database.reachable
    : !database.configured || database.reachable;

  const healthy = environment.valid && databaseOk;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: {
        environment: environment.valid ? "ok" : "invalid",
        database: database.configured
          ? database.reachable
            ? "ok"
            : "unreachable"
          : databaseRequired
            ? "required_missing"
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
