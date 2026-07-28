import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;
let lastOkAt = 0;
const TTL_MS = 60_000;

export async function ensureReverseImageSchema(
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
        console.error("[ensureReverseImageSchema] failed", error);
        return false;
      });
  }
  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reverse_image_scans (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      started_at TIMESTAMP(3) NULL,
      completed_at TIMESTAMP(3) NULL,
      risk_score INT UNSIGNED NOT NULL DEFAULT 0,
      summary TEXT NULL,
      subject_name VARCHAR(255) NULL,
      query_count INT UNSIGNED NOT NULL DEFAULT 0,
      candidate_count INT UNSIGNED NOT NULL DEFAULT 0,
      match_count INT UNSIGNED NOT NULL DEFAULT 0,
      reference_image_count INT UNSIGNED NOT NULL DEFAULT 0,
      retention_days INT UNSIGNED NOT NULL DEFAULT 30,
      expires_at TIMESTAMP(3) NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY reverse_image_scans_user_id_idx (user_id),
      KEY reverse_image_scans_created_at_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reverse_image_hits (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      scan_id BIGINT UNSIGNED NOT NULL,
      query VARCHAR(255) NOT NULL,
      title VARCHAR(500) NOT NULL,
      source_url VARCHAR(1000) NULL,
      image_url VARCHAR(1000) NOT NULL,
      similarity DECIMAL(6,5) NOT NULL DEFAULT 0,
      reference_image_type VARCHAR(32) NULL,
      risk_level VARCHAR(16) NOT NULL DEFAULT 'medium',
      stored_path VARCHAR(500) NULL,
      thumbnail_path VARCHAR(500) NULL,
      meta_json JSON NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY reverse_image_hits_scan_id_idx (scan_id),
      KEY reverse_image_hits_similarity_idx (similarity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reverse_image_module_settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      public_scan_active TINYINT(1) NOT NULL DEFAULT 1,
      face_verification_active TINYINT(1) NOT NULL DEFAULT 1,
      api_enabled TINYINT(1) NOT NULL DEFAULT 1,
      compare_url VARCHAR(500) NOT NULL DEFAULT 'http://161.97.85.22:8000/compare',
      similarity_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.600,
      compare_timeout_ms INT UNSIGNED NOT NULL DEFAULT 12000,
      updated_by_admin_id BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    INSERT IGNORE INTO reverse_image_module_settings (id) VALUES (1)
  `);

  try {
    await db.execute(sql`
      ALTER TABLE reverse_image_scans
      ADD COLUMN serp_cache_json JSON NULL AFTER expires_at
    `);
  } catch {
    /* column may already exist */
  }

  try {
    await db.execute(sql`
      ALTER TABLE reverse_image_module_settings
      ADD COLUMN public_scan_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active
    `);
  } catch {
    /* column may already exist */
  }

  try {
    await db.execute(sql`
      ALTER TABLE reverse_image_module_settings
      ADD COLUMN face_verification_active TINYINT(1) NOT NULL DEFAULT 1 AFTER public_scan_active
    `);
  } catch {
    /* column may already exist */
  }

  return true;
}
