import { eq, and } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { intelligenceReports } from "@/lib/database/schema";
import type { IntelligenceReport } from "@/lib/analysis/types";

const memoryReports = new Map<string, IntelligenceReport>();

function storeKey(userId: number, moduleKey: string): string {
  return `${userId}:${moduleKey}`;
}

export async function saveIntelligenceReport(
  userId: number,
  report: IntelligenceReport
): Promise<void> {
  memoryReports.set(storeKey(userId, report.moduleKey), report);

  const db = getDatabase();
  if (!db) return;

  await db
    .insert(intelligenceReports)
    .values({
      userId,
      moduleKey: report.moduleKey,
      subjectName: report.subjectName,
      riskScore: report.riskScore,
      riskLevel: report.riskLevel,
      hitCount: report.hits.length,
      reportJson: report,
    })
    .onDuplicateKeyUpdate({
      set: {
        subjectName: report.subjectName,
        riskScore: report.riskScore,
        riskLevel: report.riskLevel,
        hitCount: report.hits.length,
        reportJson: report,
      },
    });
}

export async function getIntelligenceReport(
  userId: number,
  moduleKey: string
): Promise<IntelligenceReport | null> {
  const cached = memoryReports.get(storeKey(userId, moduleKey));
  if (cached) return cached;

  const db = getDatabase();
  if (!db) return null;

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
  const report = row.reportJson as IntelligenceReport;
  memoryReports.set(storeKey(userId, moduleKey), report);
  return report;
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
