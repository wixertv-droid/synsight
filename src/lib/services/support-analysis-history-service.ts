import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { isStaffRole } from "@/lib/admin/permissions";
import { getDatabase } from "@/lib/database/client";
import { analysisRunSnapshots } from "@/lib/database/schema";

const SECRET_KEY_PATTERN =
  /password|passwort|secret|token|apikey|api_key|authorization|cookie|session/i;

function mysqlNow(): string {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

function expirationDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 23)
    .replace("T", " ");
}

/**
 * Support-Snapshots dürfen Analysedaten enthalten,
 * aber niemals Passwörter, Tokens, API-Keys, Cookies oder Sessions.
 */
function sanitizeSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeSnapshot);
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(input)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        output[key] = "[REDACTED]";
        continue;
      }

      output[key] = sanitizeSnapshot(entry);
    }

    return output;
  }

  return value;
}

export async function startAnalysisRunSnapshot(input: {
  userId: number;
  moduleKey: string;
  nativeRunId?: number | null;
  requestId?: string | null;
  inputSnapshot?: unknown;
  retentionDays?: number;
}): Promise<number | null> {
  const db = getDatabase();
  if (!db) return null;

  const requestedRetention = input.retentionDays ?? 30;

  // -1 = nach Analyse sofort löschen:
  // dann darf auch keine zusätzliche Support-Kopie entstehen.
  if (requestedRetention < 0) {
    return null;
  }

  // 0 = bis zur manuellen Löschung behalten.
  const retentionDays =
    requestedRetention === 0
      ? 0
      : Math.max(1, Math.min(365, requestedRetention));

  const expiresAt = retentionDays === 0 ? null : expirationDate(retentionDays);

  const result = await db.insert(analysisRunSnapshots).values({
    userId: input.userId,
    moduleKey: input.moduleKey,
    nativeRunId: input.nativeRunId ?? null,
    requestId: input.requestId ?? null,
    status: "running",
    inputSnapshotJson:
      input.inputSnapshot === undefined
        ? null
        : sanitizeSnapshot(input.inputSnapshot),
    retentionDays,
    expiresAt,
    startedAt: mysqlNow(),
  });

  return Number(result[0].insertId) || null;
}

export async function completeAnalysisRunSnapshot(input: {
  snapshotId: number | null;
  nativeRunId?: number | null;
  resultSnapshot?: unknown;
  creditsCharged?: number;
}): Promise<void> {
  if (!input.snapshotId) return;

  const db = getDatabase();
  if (!db) return;

  await db
    .update(analysisRunSnapshots)
    .set({
      status: "completed",
      nativeRunId: input.nativeRunId ?? undefined,
      resultSnapshotJson:
        input.resultSnapshot === undefined
          ? null
          : sanitizeSnapshot(input.resultSnapshot),
      creditsCharged: Math.max(0, Math.round(input.creditsCharged ?? 0)),
      errorCode: null,
      errorMessage: null,
      completedAt: mysqlNow(),
    })
    .where(eq(analysisRunSnapshots.id, input.snapshotId));
}

export async function failAnalysisRunSnapshot(input: {
  snapshotId: number | null;
  nativeRunId?: number | null;
  errorCode?: string | null;
  error?: unknown;
}): Promise<void> {
  if (!input.snapshotId) return;

  const db = getDatabase();
  if (!db) return;

  const message =
    input.error instanceof Error
      ? input.error.message
      : input.error
        ? String(input.error)
        : "Analyse fehlgeschlagen.";

  await db
    .update(analysisRunSnapshots)
    .set({
      status: "failed",
      nativeRunId: input.nativeRunId ?? undefined,
      errorCode: input.errorCode?.slice(0, 128) ?? null,
      errorMessage: message.slice(0, 4000),
      completedAt: mysqlNow(),
    })
    .where(eq(analysisRunSnapshots.id, input.snapshotId));
}

export async function listSupportAnalysisRunSnapshots(
  actor: AuthenticatedUser,
  userId: number,
  limit = 100
) {
  if (!isStaffRole(actor.role)) {
    throw new Error("STAFF_FORBIDDEN");
  }

  const db = getDatabase();
  if (!db) return [];

  const now = mysqlNow();

  return db
    .select()
    .from(analysisRunSnapshots)
    .where(
      and(
        eq(analysisRunSnapshots.userId, userId),
        or(
          isNull(analysisRunSnapshots.expiresAt),
          gt(analysisRunSnapshots.expiresAt, now)
        )
      )
    )
    .orderBy(desc(analysisRunSnapshots.createdAt))
    .limit(Math.max(1, Math.min(limit, 250)));
}
