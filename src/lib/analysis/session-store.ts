import type { IntelligenceReport } from "@/lib/analysis/types";

const reports = new Map<string, IntelligenceReport>();

function storeKey(userId: number, moduleKey: string): string {
  return `${userId}:${moduleKey}`;
}

export function saveIntelligenceReport(
  userId: number,
  report: IntelligenceReport
): void {
  reports.set(storeKey(userId, report.moduleKey), report);
}

export function getIntelligenceReport(
  userId: number,
  moduleKey: string
): IntelligenceReport | null {
  return reports.get(storeKey(userId, moduleKey)) ?? null;
}

export function clearIntelligenceReportsForTests(): void {
  reports.clear();
}
