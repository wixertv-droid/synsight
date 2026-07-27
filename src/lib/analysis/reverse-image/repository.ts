import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { ensureReverseImageSchema } from "@/lib/analysis/reverse-image/ensure-schema";
import { assembleReverseImageReport } from "@/lib/analysis/reverse-image/report-metrics";
import type {
  ReverseImageHit,
  ReverseImageReport,
  ReverseImageScanStatus,
} from "@/lib/analysis/reverse-image/types";
import { isReportExpired } from "@/lib/analysis/retention";

function mysqlNow(): string {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

interface ScanRow {
  id: number;
  user_id: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  risk_score: number;
  summary: string | null;
  subject_name: string | null;
  query_count: number;
  candidate_count: number;
  match_count: number;
  reference_image_count: number;
  retention_days: number;
  expires_at: string | null;
}

interface HitRow {
  id: number;
  scan_id: number;
  query: string;
  title: string;
  source_url: string | null;
  image_url: string;
  similarity: string | number;
  reference_image_type: string | null;
  risk_level: string;
  stored_path: string | null;
  thumbnail_path: string | null;
  created_at: string;
}

function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as T[];
  }
  if (Array.isArray(result)) return result as T[];
  return [];
}

function mapHit(row: HitRow): ReverseImageHit {
  let sourceHost: string | null = null;
  try {
    sourceHost = new URL(row.source_url || row.image_url).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    sourceHost = null;
  }

  return {
    id: String(row.id),
    query: row.query,
    title: row.title,
    sourceUrl: row.source_url,
    imageUrl: row.image_url,
    similarity: Number(row.similarity),
    referenceImageType: row.reference_image_type,
    riskLevel: (row.risk_level as ReverseImageHit["riskLevel"]) || "medium",
    storedPath: row.stored_path,
    thumbnailPath: row.thumbnail_path,
    sourceHost,
    fetchedAt: row.created_at,
  };
}

function assembleFromScan(
  scan: ScanRow,
  hits: ReverseImageHit[]
): ReverseImageReport {
  return assembleReverseImageReport({
    scanId: scan.id,
    status: scan.status as ReverseImageScanStatus,
    subjectName: scan.subject_name ?? "Unbekannt",
    startedAt: scan.started_at,
    completedAt: scan.completed_at,
    hits,
    queryCount: scan.query_count,
    candidateCount: scan.candidate_count,
    referenceImageCount: scan.reference_image_count,
    retentionDays: scan.retention_days,
    expiresAt: scan.expires_at,
  });
}

export async function createReverseImageScan(input: {
  userId: number;
  subjectName: string;
  referenceImageCount: number;
  retentionDays: number;
  expiresAt: string | null;
}): Promise<number> {
  const db = getDatabase();
  if (!db) throw new Error("database not configured");
  const ok = await ensureReverseImageSchema(true);
  if (!ok) {
    throw new Error(
      "Reverse-Image-Tabellen fehlen — bitte db:migrate ausführen."
    );
  }

  await db.execute(sql`
    INSERT INTO reverse_image_scans (
      user_id, status, started_at, subject_name, reference_image_count,
      retention_days, expires_at
    ) VALUES (
      ${input.userId}, 'running', ${mysqlNow()}, ${input.subjectName},
      ${input.referenceImageCount}, ${input.retentionDays}, ${input.expiresAt}
    )
  `);

  const rows = asRows<{ id: number }>(
    await db.execute(sql`
      SELECT id FROM reverse_image_scans
      WHERE user_id = ${input.userId} AND status = 'running'
      ORDER BY id DESC LIMIT 1
    `)
  );
  const insertId = rows[0]?.id ?? 0;
  if (!insertId)
    throw new Error("Reverse-Image-Scan konnte nicht angelegt werden.");
  return insertId;
}

export async function completeReverseImageScan(input: {
  scanId: number;
  queryCount: number;
  candidateCount: number;
  matchCount: number;
  riskScore: number;
  summary: string;
}): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  await db.execute(sql`
    UPDATE reverse_image_scans SET
      status = 'completed',
      completed_at = ${mysqlNow()},
      query_count = ${input.queryCount},
      candidate_count = ${input.candidateCount},
      match_count = ${input.matchCount},
      risk_score = ${input.riskScore},
      summary = ${input.summary}
    WHERE id = ${input.scanId}
  `);
}

export async function failReverseImageScan(
  scanId: number,
  summary: string
): Promise<void> {
  const db = getDatabase();
  if (!db) return;
  await db.execute(sql`
    UPDATE reverse_image_scans SET
      status = 'failed',
      completed_at = ${mysqlNow()},
      summary = ${summary}
    WHERE id = ${scanId}
  `);
}

export async function insertReverseImageHit(input: {
  scanId: number;
  query: string;
  title: string;
  sourceUrl: string | null;
  imageUrl: string;
  similarity: number;
  referenceImageType: string | null;
  riskLevel: string;
  storedPath: string;
  thumbnailPath: string;
}): Promise<number> {
  const db = getDatabase();
  if (!db) throw new Error("database not configured");

  await db.execute(sql`
    INSERT INTO reverse_image_hits (
      scan_id, query, title, source_url, image_url, similarity,
      reference_image_type, risk_level, stored_path, thumbnail_path
    ) VALUES (
      ${input.scanId}, ${input.query}, ${input.title}, ${input.sourceUrl},
      ${input.imageUrl}, ${input.similarity}, ${input.referenceImageType},
      ${input.riskLevel}, ${input.storedPath}, ${input.thumbnailPath}
    )
  `);

  const rows = asRows<{ id: number }>(
    await db.execute(sql`
      SELECT id FROM reverse_image_hits
      WHERE scan_id = ${input.scanId}
      ORDER BY id DESC LIMIT 1
    `)
  );
  return rows[0]?.id ?? 0;
}

export async function getLatestReverseImageReport(
  userId: number
): Promise<ReverseImageReport | null> {
  const db = getDatabase();
  if (!db) return null;
  const ok = await ensureReverseImageSchema();
  if (!ok) return null;

  const scans = asRows<ScanRow>(
    await db.execute(sql`
      SELECT * FROM reverse_image_scans
      WHERE user_id = ${userId} AND status = 'completed'
      ORDER BY id DESC LIMIT 1
    `)
  );
  const scan = scans[0];
  if (!scan) return null;
  if (isReportExpired({ expiresAt: scan.expires_at })) return null;

  const hitRows = asRows<HitRow>(
    await db.execute(sql`
      SELECT * FROM reverse_image_hits
      WHERE scan_id = ${scan.id}
      ORDER BY similarity DESC, id ASC
    `)
  );

  return assembleFromScan(scan, hitRows.map(mapHit));
}

export async function getReverseImageScanStatus(
  userId: number,
  scanId: number
): Promise<
  "running" | "completed" | "failed" | "pending" | "unavailable" | null
> {
  const db = getDatabase();
  if (!db) return null;
  const ok = await ensureReverseImageSchema();
  if (!ok) return null;

  const scans = asRows<{ status: string }>(
    await db.execute(sql`
      SELECT status FROM reverse_image_scans
      WHERE id = ${scanId} AND user_id = ${userId}
      LIMIT 1
    `)
  );
  const status = scans[0]?.status;
  if (!status) return null;
  if (
    status === "running" ||
    status === "completed" ||
    status === "failed" ||
    status === "pending" ||
    status === "unavailable"
  ) {
    return status;
  }
  return null;
}

export async function getReverseImageReportByScanId(
  userId: number,
  scanId: number
): Promise<ReverseImageReport | null> {
  const db = getDatabase();
  if (!db) return null;
  const ok = await ensureReverseImageSchema();
  if (!ok) return null;

  const scans = asRows<ScanRow>(
    await db.execute(sql`
      SELECT * FROM reverse_image_scans
      WHERE id = ${scanId} AND user_id = ${userId}
      LIMIT 1
    `)
  );
  const scan = scans[0];
  if (!scan || scan.status !== "completed") return null;

  const hitRows = asRows<HitRow>(
    await db.execute(sql`
      SELECT * FROM reverse_image_hits
      WHERE scan_id = ${scan.id}
      ORDER BY similarity DESC, id ASC
    `)
  );

  return assembleFromScan(scan, hitRows.map(mapHit));
}
