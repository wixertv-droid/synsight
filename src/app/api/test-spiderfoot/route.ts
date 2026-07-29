import {
  startSpiderFootScan,
  getSpiderFootStatus,
  getSpiderFootResults,
} from "@/lib/services/spiderfoot";


export async function GET() {

  const scan = await startSpiderFootScan(
    "r2306",
    "SynSight Test"
  );


  return Response.json({
    message: "SpiderFoot gestartet",
    scan
  });
}
