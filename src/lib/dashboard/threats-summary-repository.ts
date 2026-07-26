import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { userThreatsSummaries } from "@/lib/database/schema";
import type { PlatformThreat } from "@/lib/dashboard/build-threats-from-reports";

export type ThreatsSummaryStatus = "ready" | "generating" | "failed" | "empty";

export interface ThreatsSummaryRecord {
  id: number;
  userId: number;
  summaryText: string;
  model: string | null;
  promptHash: string | null;
  inputFingerprint: string;
  threatCount: number;
  modules: string[];
  status: ThreatsSummaryStatus;
  errorMessage: string | null;
  generatedAt: string;
  updatedAt: string;
}

function mapRow(
  row: typeof userThreatsSummaries.$inferSelect
): ThreatsSummaryRecord {
  const modules = Array.isArray(row.modulesJson)
    ? (row.modulesJson as string[])
    : [];
  return {
    id: row.id,
    userId: row.userId,
    summaryText: row.summaryText,
    model: row.model,
    promptHash: row.promptHash,
    inputFingerprint: row.inputFingerprint,
    threatCount: row.threatCount,
    modules,
    status: row.status as ThreatsSummaryStatus,
    errorMessage: row.errorMessage,
    generatedAt: row.generatedAt,
    updatedAt: row.updatedAt,
  };
}

export async function getThreatsSummaryForUser(
  userId: number
): Promise<ThreatsSummaryRecord | null> {
  const db = getDatabase();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(userThreatsSummaries)
      .where(eq(userThreatsSummaries.userId, userId))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    console.error("[threats-summary] read failed", error);
    return null;
  }
}

export async function upsertThreatsSummary(input: {
  userId: number;
  summaryText: string;
  model?: string | null;
  promptHash?: string | null;
  inputFingerprint: string;
  threatCount: number;
  modules: string[];
  status: ThreatsSummaryStatus;
  errorMessage?: string | null;
}): Promise<ThreatsSummaryRecord | null> {
  const db = getDatabase();
  if (!db) return null;

  const now = new Date().toISOString().slice(0, 23).replace("T", " ");
  try {
    await db
      .insert(userThreatsSummaries)
      .values({
        userId: input.userId,
        summaryText: input.summaryText,
        model: input.model ?? null,
        promptHash: input.promptHash ?? null,
        inputFingerprint: input.inputFingerprint,
        threatCount: input.threatCount,
        modulesJson: input.modules,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        generatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          summaryText: input.summaryText,
          model: input.model ?? null,
          promptHash: input.promptHash ?? null,
          inputFingerprint: input.inputFingerprint,
          threatCount: input.threatCount,
          modulesJson: input.modules,
          status: input.status,
          errorMessage: input.errorMessage ?? null,
          generatedAt: now,
        },
      });
    return getThreatsSummaryForUser(input.userId);
  } catch (error) {
    console.error("[threats-summary] upsert failed", error);
    return null;
  }
}

export function hashThreatsPrompt(threats: PlatformThreat[]): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        threats.map((t) => ({
          id: t.id,
          level: t.level,
          title: t.title,
          found: t.found,
          moduleKey: t.moduleKey,
        }))
      )
    )
    .digest("hex")
    .slice(0, 64);
}
