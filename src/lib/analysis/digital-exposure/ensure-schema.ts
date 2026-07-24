/**
 * Ensure Digital Leak scan tables exist.
 * Production often had pricing rows healed without migration 020 DDL —
 * querying missing `digital_exposure_*` tables then crashes Results SSR.
 */
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;
let lastOkAt = 0;
const TTL_MS = 60_000;

export function resetDigitalExposureSchemaEnsureForTests(): void {
  ensurePromise = null;
  lastOkAt = 0;
}

export async function ensureDigitalExposureSchema(
  force = false
): Promise<boolean> {
  if (!force && lastOkAt > 0 && Date.now() - lastOkAt < TTL_MS) {
    return true;
  }
  if (force) ensurePromise = null;

  if (!ensurePromise) {
    ensurePromise = runEnsure()
      .then((ok) => {
        if (ok) lastOkAt = Date.now();
        else ensurePromise = null;
        return ok;
      })
      .catch((error) => {
        ensurePromise = null;
        console.error("[ensureDigitalExposureSchema] failed", error);
        return false;
      });
  }
  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS digital_exposure_scans (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP(3) NULL,
        completed_at TIMESTAMP(3) NULL,
        risk_score INT UNSIGNED NOT NULL DEFAULT 0,
        summary TEXT NULL,
        subject_name VARCHAR(255) NULL,
        email_count INT UNSIGNED NOT NULL DEFAULT 0,
        phone_count INT UNSIGNED NOT NULL DEFAULT 0,
        finding_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY digital_exposure_scans_user_id_idx (user_id),
        KEY digital_exposure_scans_created_at_idx (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS digital_exposure_results (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        scan_id BIGINT UNSIGNED NOT NULL,
        type VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        risk_level VARCHAR(16) NOT NULL DEFAULT 'low',
        source_name VARCHAR(255) NULL,
        source_date VARCHAR(32) NULL,
        recommendation TEXT NULL,
        source_url VARCHAR(500) NULL,
        identifier_masked VARCHAR(255) NULL,
        data_classes_json JSON NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY digital_exposure_results_scan_id_idx (scan_id),
        KEY digital_exposure_results_type_idx (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        provider VARCHAR(64) NOT NULL,
        request_type VARCHAR(64) NOT NULL,
        cost_eur DECIMAL(14,6) NOT NULL DEFAULT 0,
        user_id BIGINT UNSIGNED NULL,
        analysis_id BIGINT UNSIGNED NULL,
        analysis_key VARCHAR(64) NULL,
        success TINYINT(1) NOT NULL DEFAULT 1,
        detail VARCHAR(500) NULL,
        meta_json JSON NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY api_usage_logs_provider_created_idx (provider, created_at),
        KEY api_usage_logs_user_id_idx (user_id),
        KEY api_usage_logs_analysis_id_idx (analysis_id),
        KEY api_usage_logs_created_at_idx (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Optional FK / column upgrades — ignore if already present or unsupported
    try {
      await db.execute(sql`
        ALTER TABLE api_usage_events
        ADD COLUMN analysis_id BIGINT UNSIGNED NULL AFTER user_id
      `);
    } catch {
      /* column may already exist */
    }
    try {
      await db.execute(sql`
        CREATE INDEX api_usage_events_analysis_id_idx
        ON api_usage_events (analysis_id)
      `);
    } catch {
      /* index may already exist */
    }

    return true;
  } catch (error) {
    console.error("[ensureDigitalExposureSchema] DDL failed", error);
    return false;
  }
}
