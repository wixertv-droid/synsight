import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { ensureHitActionsSchema } from "@/lib/analysis/ensure-hit-actions-schema";
import { analysisHitFingerprint } from "@/lib/analysis/hit-fingerprint";
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

export type AnalysisSourceModule =
  "google_search" | "username_intelligence" | "digital_leak_exposure";

export type HitActionKind = "ignored" | "self" | "ordered" | "resolved";

export interface HitActionRecord {
  userId: number;
  sourceModule: AnalysisSourceModule;
  hitFingerprint: string;
  hitPlatform: string;
  hitUrl: string | null;
  action: HitActionKind;
  updatedAt: string;
}

export interface SynSightOrderRecord {
  id: number;
  userId: number;
  sourceModule: string;
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

const memoryActions = new Map<string, HitActionRecord>();
const memoryOrders: SynSightOrderRecord[] = [];
let memoryOrderSeq = 1;

function memoryKey(userId: number, module: string, fingerprint: string) {
  return `${userId}:${module}:${fingerprint}`;
}

function asRowArray<T>(rows: unknown): T[] {
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    return rows[0] as T[];
  }
  if (Array.isArray(rows)) return rows as T[];
  return [];
}

export async function listHitActions(
  userId: number,
  sourceModule?: AnalysisSourceModule
): Promise<HitActionRecord[]> {
  await ensureHitActionsSchema();
  const db = getDatabase();
  if (!db) {
    return [...memoryActions.values()].filter(
      (row) =>
        row.userId === userId &&
        (!sourceModule || row.sourceModule === sourceModule)
    );
  }

  const rows = sourceModule
    ? await db.execute(sql`
        SELECT
          user_id AS userId,
          source_module AS sourceModule,
          hit_fingerprint AS hitFingerprint,
          hit_platform AS hitPlatform,
          hit_url AS hitUrl,
          action,
          updated_at AS updatedAt
        FROM username_hit_actions
        WHERE user_id = ${userId} AND source_module = ${sourceModule}
      `)
    : await db.execute(sql`
        SELECT
          user_id AS userId,
          source_module AS sourceModule,
          hit_fingerprint AS hitFingerprint,
          hit_platform AS hitPlatform,
          hit_url AS hitUrl,
          action,
          updated_at AS updatedAt
        FROM username_hit_actions
        WHERE user_id = ${userId}
      `);

  return asRowArray<HitActionRecord>(rows).map((row) => ({
    ...row,
    userId: Number(row.userId),
    sourceModule: row.sourceModule as AnalysisSourceModule,
  }));
}

export async function listIgnoredFingerprints(
  userId: number,
  sourceModule?: AnalysisSourceModule
): Promise<Set<string>> {
  const actions = await listHitActions(userId, sourceModule);
  return new Set(
    actions
      .filter((row) => row.action === "ignored")
      .map((row) => row.hitFingerprint)
  );
}

/** Ignored + resolved — excluded from KPIs / risk statistics. */
export async function listExcludedFromStatsFingerprints(
  userId: number,
  sourceModule?: AnalysisSourceModule
): Promise<Set<string>> {
  const actions = await listHitActions(userId, sourceModule);
  return new Set(
    actions
      .filter((row) => row.action === "ignored" || row.action === "resolved")
      .map((row) => row.hitFingerprint)
  );
}

export async function upsertHitAction(input: {
  userId: number;
  sourceModule: AnalysisSourceModule;
  analysisId?: number | null;
  platform: string;
  profileUrl: string | null;
  title?: string;
  action: HitActionKind;
}): Promise<HitActionRecord> {
  await ensureHitActionsSchema();
  const fingerprint = analysisHitFingerprint({
    module: input.sourceModule,
    url: input.profileUrl,
    platform: input.platform,
    title: input.title,
  });
  const now = new Date().toISOString();
  const record: HitActionRecord = {
    userId: input.userId,
    sourceModule: input.sourceModule,
    hitFingerprint: fingerprint,
    hitPlatform: input.platform,
    hitUrl: input.profileUrl,
    action: input.action,
    updatedAt: now,
  };

  const db = getDatabase();
  if (!db) {
    memoryActions.set(
      memoryKey(input.userId, input.sourceModule, fingerprint),
      record
    );
    return record;
  }

  await db.execute(sql`
    INSERT INTO username_hit_actions
      (user_id, analysis_id, source_module, hit_fingerprint, hit_platform, hit_url, action)
    VALUES
      (${input.userId}, ${input.analysisId ?? null}, ${input.sourceModule}, ${fingerprint}, ${input.platform}, ${input.profileUrl}, ${input.action})
    ON DUPLICATE KEY UPDATE
      action = VALUES(action),
      hit_platform = VALUES(hit_platform),
      hit_url = VALUES(hit_url),
      analysis_id = VALUES(analysis_id)
  `);

  return record;
}

export async function clearHitAction(input: {
  userId: number;
  sourceModule: AnalysisSourceModule;
  platform: string;
  profileUrl: string | null;
  title?: string;
}): Promise<void> {
  await ensureHitActionsSchema();
  const fingerprint = analysisHitFingerprint({
    module: input.sourceModule,
    url: input.profileUrl,
    platform: input.platform,
    title: input.title,
  });
  const db = getDatabase();
  if (!db) {
    memoryActions.delete(
      memoryKey(input.userId, input.sourceModule, fingerprint)
    );
    return;
  }
  await db.execute(sql`
    DELETE FROM username_hit_actions
    WHERE user_id = ${input.userId}
      AND source_module = ${input.sourceModule}
      AND hit_fingerprint = ${fingerprint}
  `);
}

export async function createSynSightOrder(input: {
  userId: number;
  sourceModule: AnalysisSourceModule;
  platform: string;
  profileUrl: string | null;
  title: string;
  orderType: SynSightOrderType;
  note?: string | null;
}): Promise<SynSightOrderRecord> {
  await ensureHitActionsSchema();
  const fingerprint = analysisHitFingerprint({
    module: input.sourceModule,
    url: input.profileUrl,
    platform: input.platform,
    title: input.title,
  });
  const now = new Date().toISOString();

  await upsertHitAction({
    userId: input.userId,
    sourceModule: input.sourceModule,
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
      sourceModule: input.sourceModule,
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
      (${input.userId}, ${input.sourceModule}, ${fingerprint}, ${input.platform}, ${input.profileUrl}, ${input.title}, ${input.orderType}, 'vorbereitet', ${input.note ?? null})
  `);
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number(
    (header as { insertId?: number | string })?.insertId ?? 0
  );

  return {
    id: insertId,
    userId: input.userId,
    sourceModule: input.sourceModule,
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

export async function listSynSightOrders(
  userId: number
): Promise<SynSightOrderRecord[]> {
  await ensureHitActionsSchema();
  const db = getDatabase();
  if (!db) {
    return memoryOrders.filter((order) => order.userId === userId);
  }

  const rows = await db.execute(sql`
    SELECT
      id,
      user_id AS userId,
      source_module AS sourceModule,
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

/** Strip ignored hits and recompute overview metrics for username reports. */
export async function filterIgnoredFromUsernameReport(
  userId: number,
  report: UsernameReport | null
): Promise<UsernameReport | null> {
  if (!report) return null;
  const excluded = await listExcludedFromStatsFingerprints(
    userId,
    "username_intelligence"
  );
  if (excluded.size === 0) return report;

  const hits = report.hits.filter((hit) => {
    const fp = analysisHitFingerprint({
      module: "username_intelligence",
      url: hit.profileUrl,
      platform: hit.platform,
      title: hit.title,
    });
    return !excluded.has(fp);
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
