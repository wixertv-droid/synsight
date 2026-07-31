import { startSpiderFootScan } from "@/lib/services/spiderfoot";

/**
 * Dev-only smoke endpoint. Disabled in production so the public site
 * cannot trigger SpiderFoot scans against arbitrary infrastructure.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  const scan = await startSpiderFootScan("r2306", "SynSight Test");

  return Response.json({
    message: "SpiderFoot gestartet",
    scan,
  });
}
