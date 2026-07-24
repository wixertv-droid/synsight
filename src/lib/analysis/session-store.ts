import { eq, and } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { intelligenceReports } from "@/lib/database/schema";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import {
  isReportExpired,
  normalizeExpiresAtValue,
  toMysqlTimestamp,
} from "@/lib/analysis/retention";
import type { IntelligenceReport } from "@/lib/analysis/types";

const memoryReports = new Map<string, IntelligenceReport>();

function storeKey(userId: number, moduleKey: string): string {
  return `${userId}:${moduleKey}`;
}

function forgetIfExpired(
  userId: number,
  moduleKey: string,
  report: IntelligenceReport
): IntelligenceReport | null {
  if (
    isReportExpired({
      expiresAt: report.expiresAt,
      generatedAt: report.generatedAt,
      retentionDays: report.retentionDays,
    })
  ) {
    memoryReports.delete(storeKey(userId, moduleKey));
    void deleteIntelligenceReport(userId, moduleKey);
    return null;
  }
  return report;
}

export async function deleteIntelligenceReport(
  userId: number,
  moduleKey: string
): Promise<void> {
  memoryReports.delete(storeKey(userId, moduleKey));
  const db = getDatabase();
  if (!db) return;
  try {
    await db
      .delete(intelligenceReports)
      .where(
        and(
          eq(intelligenceReports.userId, userId),
          eq(intelligenceReports.moduleKey, moduleKey)
        )
      );
  } catch (error) {
    console.error("[intelligence-reports] delete failed", error);
  }
}

export async function saveIntelligenceReport(
  userId: number,
  report: IntelligenceReport
): Promise<void> {
  const normalized = normalizeIntelligenceReport(report);
  if (!normalized) {
    throw new Error("intelligence_reports: report payload invalid");
  }

  // Keep ISO in JSON / memory; convert only for the DB timestamp column
  memoryReports.set(storeKey(userId, normalized.moduleKey), normalized);

  const db = getDatabase();
  if (!db) {
    throw new Error(
      "intelligence_reports: database not configured — report would be lost on reload"
    );
  }

  const expiresAtMysql =
    normalized.expiresAt == null
      ? null
      : toMysqlTimestamp(normalized.expiresAt);

  try {
    const reportJson = JSON.parse(
      JSON.stringify(normalized)
    ) as IntelligenceReport;
    await db
      .insert(intelligenceReports)
      .values({
        userId,
        moduleKey: normalized.moduleKey,
        subjectName: normalized.subjectName,
        riskScore: normalized.riskScore,
        riskLevel: normalized.riskLevel,
        hitCount: normalized.hits.length,
        retentionDays: normalized.retentionDays,
        expiresAt: expiresAtMysql,
        reportJson,
      })
      .onDuplicateKeyUpdate({
        set: {
          subjectName: normalized.subjectName,
          riskScore: normalized.riskScore,
          riskLevel: normalized.riskLevel,
          hitCount: normalized.hits.length,
          retentionDays: normalized.retentionDays,
          expiresAt: expiresAtMysql,
          reportJson,
        },
      });
  } catch (error) {
    console.error("[intelligence-reports] save failed", error);
    // Do not keep a false "saved" memory-only state if DB write failed
    memoryReports.delete(storeKey(userId, normalized.moduleKey));
    throw error;
  }
}

export async function getIntelligenceReport(
  userId: number,
  moduleKey: string
): Promise<IntelligenceReport | null> {
  const cached = memoryReports.get(storeKey(userId, moduleKey));
  if (cached) {
    return forgetIfExpired(userId, moduleKey, cached);
  }

  const db = getDatabase();
  if (!db) return null;

  try {
    const rows = await db
      .select()
      .from(intelligenceReports)
      .where(
        and(
          eq(intelligenceReports.userId, userId),
          eq(intelligenceReports.moduleKey, moduleKey)
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    const report = normalizeIntelligenceReport(row.reportJson);
    if (!report) return null;

    // Prefer DB retention columns when present (normalize MySQL/Date → ISO)
    if (typeof row.retentionDays === "number") {
      report.retentionDays = row.retentionDays;
    }
    if (row.expiresAt !== undefined) {
      report.expiresAt = normalizeExpiresAtValue(row.expiresAt);
    }

    const valid = forgetIfExpired(userId, moduleKey, report);
    if (!valid) return null;
    memoryReports.set(storeKey(userId, moduleKey), valid);
    return valid;
  } catch (error) {
    console.error("[intelligence-reports] load failed", error);
    return null;
  }
}

/** Sync helper for client-facing code that already loaded via async. */
export function getIntelligenceReportSync(
  userId: number,
  moduleKey: string
): IntelligenceReport | null {
  const cached = memoryReports.get(storeKey(userId, moduleKey));
  if (!cached) return null;
  return forgetIfExpired(userId, moduleKey, cached);
}

export function clearIntelligenceReportsForTests(): void {
  memoryReports.clear();
}
