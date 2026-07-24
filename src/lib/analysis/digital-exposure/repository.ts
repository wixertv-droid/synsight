import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  apiUsageLogs,
  digitalExposureResults,
  digitalExposureScans,
} from "@/lib/database/schema";
import type {
  DigitalExposureFinding,
  DigitalExposureReport,
  DigitalExposureScanStatus,
} from "@/lib/analysis/digital-exposure/types";
import { buildGeminiPrepPayload } from "@/lib/analysis/digital-exposure/gemini-prep";
import { ensureDigitalExposureSchema } from "@/lib/analysis/digital-exposure/ensure-schema";

function mysqlNow(): string {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function mapFinding(
  row: typeof digitalExposureResults.$inferSelect
): DigitalExposureFinding {
  const dataClasses = Array.isArray(row.dataClassesJson)
    ? (row.dataClassesJson as unknown[]).filter(
        (item): item is string => typeof item === "string"
      )
    : [];
  return {
    type: row.type as DigitalExposureFinding["type"],
    title: row.title,
    description: row.description ?? "",
    riskLevel: (row.riskLevel as DigitalExposureFinding["riskLevel"]) || "low",
    sourceName: row.sourceName,
    sourceDate: row.sourceDate,
    recommendation: row.recommendation,
    sourceUrl: row.sourceUrl,
    identifierMasked: row.identifierMasked,
    dataClasses,
  };
}

export async function createDigitalExposureScan(input: {
  userId: number;
  subjectName: string;
  emailCount: number;
  phoneCount: number;
}): Promise<number> {
  const db = getDatabase();
  if (!db) throw new Error("database not configured");
  const ok = await ensureDigitalExposureSchema(true);
  if (!ok) {
    throw new Error(
      "Digital-Leak-Tabellen fehlen — bitte db:migrate bzw. db:ensure-catalog ausführen."
    );
  }

  const result = await db.insert(digitalExposureScans).values({
    userId: input.userId,
    status: "running",
    startedAt: mysqlNow(),
    subjectName: input.subjectName,
    emailCount: input.emailCount,
    phoneCount: input.phoneCount,
    riskScore: 0,
    findingCount: 0,
  });

  const insertId = Number(
    (result as { insertId?: number | bigint }).insertId ?? 0
  );
  if (!Number.isFinite(insertId) || insertId <= 0) {
    throw new Error("digital_exposure_scans insert failed");
  }
  return insertId;
}

export async function completeDigitalExposureScan(input: {
  scanId: number;
  status: DigitalExposureScanStatus;
  riskScore: number;
  summary: string;
  findings: DigitalExposureFinding[];
}): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error("database not configured");
  await ensureDigitalExposureSchema(false);

  await db
    .update(digitalExposureScans)
    .set({
      status: input.status,
      completedAt: mysqlNow(),
      riskScore: Math.max(0, Math.min(100, input.riskScore)),
      summary: input.summary.slice(0, 4000),
      findingCount: input.findings.length,
    })
    .where(eq(digitalExposureScans.id, input.scanId));

  if (input.findings.length === 0) return;

  await db.insert(digitalExposureResults).values(
    input.findings.map((finding) => ({
      scanId: input.scanId,
      type: finding.type,
      title: finding.title.slice(0, 255),
      description: finding.description.slice(0, 4000) || null,
      riskLevel: finding.riskLevel,
      sourceName: finding.sourceName?.slice(0, 255) ?? null,
      sourceDate: finding.sourceDate?.slice(0, 32) ?? null,
      recommendation: finding.recommendation?.slice(0, 2000) ?? null,
      sourceUrl: finding.sourceUrl?.slice(0, 500) ?? null,
      identifierMasked: finding.identifierMasked?.slice(0, 255) ?? null,
      dataClassesJson: finding.dataClasses,
    }))
  );
}

export async function getLatestDigitalExposureReport(
  userId: number
): Promise<DigitalExposureReport | null> {
  const db = getDatabase();
  if (!db) return null;

  try {
    await ensureDigitalExposureSchema(false);

    const scans = await db
      .select()
      .from(digitalExposureScans)
      .where(eq(digitalExposureScans.userId, userId))
      .orderBy(desc(digitalExposureScans.createdAt))
      .limit(1);

    const scan = scans[0];
    if (!scan) return null;

    const rows = await db
      .select()
      .from(digitalExposureResults)
      .where(eq(digitalExposureResults.scanId, scan.id));

    const findings = rows.map(mapFinding);
    const subjectName = scan.subjectName ?? "Unbekannt";

    return {
      scanId: scan.id,
      moduleKey: "digital_leak_exposure",
      subjectName,
      status: scan.status as DigitalExposureScanStatus,
      riskScore: scan.riskScore,
      summary: scan.summary ?? "",
      emailCount: scan.emailCount,
      phoneCount: scan.phoneCount,
      findingCount: scan.findingCount,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
      findings,
      geminiPrep: buildGeminiPrepPayload({
        subjectName,
        riskScore: scan.riskScore,
        findings,
      }),
      apiConfigured: true,
      providerLabel: "DeHashed",
    };
  } catch (error) {
    // Missing tables / transient DB errors must never crash Results SSR
    console.error("[getLatestDigitalExposureReport] failed", error);
    return null;
  }
}

export async function writeApiUsageLog(input: {
  provider: string;
  requestType: string;
  costEur?: number;
  userId?: number | null;
  analysisId?: number | null;
  analysisKey?: string | null;
  success?: boolean;
  detail?: string | null;
  metaJson?: unknown;
}): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  try {
    await ensureDigitalExposureSchema(false);
    await db.insert(apiUsageLogs).values({
      provider: input.provider,
      requestType: input.requestType,
      costEur: (input.costEur ?? 0).toFixed(6),
      userId: input.userId ?? null,
      analysisId: input.analysisId ?? null,
      analysisKey: input.analysisKey ?? null,
      success: input.success ?? true,
      detail: input.detail?.slice(0, 500) ?? null,
      metaJson: input.metaJson ?? null,
    });
  } catch (error) {
    console.error("[api_usage_logs] write failed", error);
  }
}
