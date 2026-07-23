import { eq, and } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { intelligenceReports } from "@/lib/database/schema";
import { normalizeIntelligenceReport } from "@/lib/analysis/normalize-report";
import type { IntelligenceReport } from "@/lib/analysis/types";

const memoryReports = new Map<string, IntelligenceReport>();

function storeKey(userId: number, moduleKey: string): string {
  return `${userId}:${moduleKey}`;
}

export async function saveIntelligenceReport(
  userId: number,
  report: IntelligenceReport
): Promise<void> {
  const normalized = normalizeIntelligenceReport(report);
  if (!normalized) return;

  memoryReports.set(storeKey(userId, normalized.moduleKey), normalized);

  const db = getDatabase();
  if (!db) return;

  try {
    // Ensure plain JSON (no prototype / undefined quirks) for MySQL JSON column
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
        reportJson,
      })
      .onDuplicateKeyUpdate({
        set: {
          subjectName: normalized.subjectName,
          riskScore: normalized.riskScore,
          riskLevel: normalized.riskLevel,
          hitCount: normalized.hits.length,
          reportJson,
        },
      });
  } catch (error) {
    // Persistence must not break the live analysis response (e.g. missing migration).
    console.error("[intelligence-reports] save failed", error);
  }
}

export async function getIntelligenceReport(
  userId: number,
  moduleKey: string
): Promise<IntelligenceReport | null> {
  const cached = memoryReports.get(storeKey(userId, moduleKey));
  if (cached) return cached;

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
    memoryReports.set(storeKey(userId, moduleKey), report);
    return report;
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
  return memoryReports.get(storeKey(userId, moduleKey)) ?? null;
}

export function clearIntelligenceReportsForTests(): void {
  memoryReports.clear();
}
