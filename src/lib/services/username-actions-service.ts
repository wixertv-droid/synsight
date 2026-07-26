import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { ensureUsernameActionsSchema } from "@/lib/analysis/username/ensure-actions-schema";
import { usernameHitFingerprint } from "@/lib/analysis/username/hit-fingerprint";
import type {
  SynSightOrderStatus,
  SynSightOrderType,
  UsernameReport,
} from "@/lib/analysis/username/types";
import {
  buildActionPlan,
  buildIdentityFindings,
  buildManagementOverview,
  buildSecurityOverview,
  computeIdentityScore,
  computeRiskScore,
} from "@/lib/analysis/username/report-metrics";

export type HitActionKind = "ignored" | "self" | "ordered";

export interface UsernameHitActionRecord {
  userId: number;
  hitFingerprint: string;
  hitPlatform: string;
  hitUrl: string | null;
  action: HitActionKind;
  updatedAt: string;
}

export interface SynSightOrderRecord {
  id: number;
  userId: number;
  hitFingerprint: string;
  hitPlatform: string;
  hitUrl: string | null;
  title: string;
  orderType: string;
  status: SynSightOrderStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const memoryActions = new Map<string, UsernameHitActionRecord>();
const memoryOrders: SynSightOrderRecord[] = [];
let memoryOrderSeq = 1;

function memoryKey(userId: number, fingerprint: string) {
  return `${userId}:${fingerprint}`;
}

function asRowArray<T>(rows: unknown): T[] {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0] as T[];
  }
  if (Array.isArray(rows)) return rows as T[];
  return [];
}

export async function listIgnoredFingerprints(
  userId: number
): Promise<Set<string>> {
  await ensureUsernameActionsSchema();
  const db = getDatabase();
  if (!db) {
    return new Set(
      [...memoryActions.values()]
        .filter((row) => row.userId === userId && row.action === "ignored")
        .map((row) => row.hitFingerprint)
    );
  }

  const rows = await db.execute(sql`
    SELECT hit_fingerprint AS hitFingerprint
    FROM username_hit_actions
    WHERE user_id = ${userId} AND action = 'ignored'
  `);
  const fingerprints = asRowArray<{
    hitFingerprint?: string;
    hit_fingerprint?: string;
  }>(rows)
    .map((row) => row.hitFingerprint ?? row.hit_fingerprint)
    .filter((value): value is string => Boolean(value));
  return new Set(fingerprints);
}

export async function upsertHitAction(input: {
  userId: number;
  analysisId?: number | null;
  platform: string;
  profileUrl: string | null;
  title?: string;
  action: HitActionKind;
}): Promise<UsernameHitActionRecord> {
  await ensureUsernameActionsSchema();
  const fingerprint = usernameHitFingerprint({
    platform: input.platform,
    profileUrl: input.profileUrl,
    title: input.title,
  });
  const now = new Date().toISOString();
  const record: UsernameHitActionRecord = {
    userId: input.userId,
    hitFingerprint: fingerprint,
    hitPlatform: input.platform,
    hitUrl: input.profileUrl,
    action: input.action,
    updatedAt: now,
  };

  const db = getDatabase();
  if (!db) {
    memoryActions.set(memoryKey(input.userId, fingerprint), record);
    return record;
  }

  await db.execute(sql`
    INSERT INTO username_hit_actions
      (user_id, analysis_id, hit_fingerprint, hit_platform, hit_url, action)
    VALUES
      (${input.userId}, ${input.analysisId ?? null}, ${fingerprint}, ${input.platform}, ${input.profileUrl}, ${input.action})
    ON DUPLICATE KEY UPDATE
      action = VALUES(action),
      hit_platform = VALUES(hit_platform),
      hit_url = VALUES(hit_url),
      analysis_id = VALUES(analysis_id)
  `);

  return record;
}

export async function createSynSightOrder(input: {
  userId: number;
  platform: string;
  profileUrl: string | null;
  title: string;
  orderType: SynSightOrderType;
  note?: string | null;
}): Promise<SynSightOrderRecord> {
  await ensureUsernameActionsSchema();
  const fingerprint = usernameHitFingerprint({
    platform: input.platform,
    profileUrl: input.profileUrl,
    title: input.title,
  });
  const now = new Date().toISOString();

  await upsertHitAction({
    userId: input.userId,
    platform: input.platform,
    profileUrl: input.profileUrl,
    title: input.title,
    action: "ordered",
  });

  const db = getDatabase();
  if (!db) {
    const record: SynSightOrderRecord = {
      id: memoryOrderSeq++,
      userId: input.userId,
      hitFingerprint: fingerprint,
      hitPlatform: input.platform,
      hitUrl: input.profileUrl,
      title: input.title,
      orderType: input.orderType,
      status: "vorbereitet",
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    memoryOrders.unshift(record);
    return record;
  }

  const result = await db.execute(sql`
    INSERT INTO synsight_orders
      (user_id, source_module, hit_fingerprint, hit_platform, hit_url, title, order_type, status, note)
    VALUES
      (${input.userId}, 'username_intelligence', ${fingerprint}, ${input.platform}, ${input.profileUrl}, ${input.title}, ${input.orderType}, 'vorbereitet', ${input.note ?? null})
  `);
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number(
    (header as { insertId?: number | string })?.insertId ?? 0
  );

  return {
    id: insertId,
    userId: input.userId,
    hitFingerprint: fingerprint,
    hitPlatform: input.platform,
    hitUrl: input.profileUrl,
    title: input.title,
    orderType: input.orderType,
    status: "vorbereitet",
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Strip ignored hits and recompute overview metrics for dashboard/report consumers. */
export async function filterIgnoredFromUsernameReport(
  userId: number,
  report: UsernameReport | null
): Promise<UsernameReport | null> {
  if (!report) return null;
  const ignored = await listIgnoredFingerprints(userId);
  if (ignored.size === 0) return report;

  const hits = report.hits.filter((hit) => {
    const fp = usernameHitFingerprint({
      platform: hit.platform,
      profileUrl: hit.profileUrl,
      title: hit.title,
    });
    return !ignored.has(fp);
  });

  const identityScore = computeIdentityScore(hits);
  const riskScore = computeRiskScore(hits);
  const confidence =
    hits.length === 0
      ? 0
      : Math.round(
          hits.reduce((sum, h) => sum + h.confidence, 0) / hits.length
        );
  const managementOverview = buildManagementOverview({
    username: report.subjectUsername,
    hits,
    identityScore,
    riskScore,
    confidence,
  });
  const actions = buildActionPlan(hits, managementOverview);
  const securityOverview = buildSecurityOverview({
    hits,
    actions,
    overallRisk: managementOverview.overallRisk,
  });

  return {
    ...report,
    hits,
    hitCount: hits.length,
    identityScore,
    riskScore,
    confidence,
    managementOverview,
    securityOverview,
    identityFindings: buildIdentityFindings(hits),
    actions,
    summary: managementOverview.headline,
  };
}

export async function listSynSightOrders(
  userId: number
): Promise<SynSightOrderRecord[]> {
  await ensureUsernameActionsSchema();
  const db = getDatabase();
  if (!db) {
    return memoryOrders.filter((order) => order.userId === userId);
  }

  const rows = await db.execute(sql`
    SELECT
      id,
      user_id AS userId,
      hit_fingerprint AS hitFingerprint,
      hit_platform AS hitPlatform,
      hit_url AS hitUrl,
      title,
      order_type AS orderType,
      status,
      note,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM synsight_orders
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 100
  `);
  return asRowArray<SynSightOrderRecord>(rows).map((row) => ({
    ...row,
    id: Number(row.id),
    userId: Number(row.userId),
  }));
}
