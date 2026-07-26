/**
 * Ensure user_threats_summaries exists at runtime.
 * Production may deploy code before `db:migrate` runs migration 030.
 */
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;
let lastOkAt = 0;
const TTL_MS = 60_000;

export function resetThreatsSummarySchemaEnsureForTests(): void {
  ensurePromise = null;
  lastOkAt = 0;
}

export async function ensureThreatsSummarySchema(
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
        console.error("[ensureThreatsSummarySchema] failed", error);
        return false;
      });
  }
  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_threats_summaries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      summary_text TEXT NOT NULL,
      model VARCHAR(120) NULL,
      prompt_hash VARCHAR(64) NULL,
      input_fingerprint VARCHAR(64) NOT NULL,
      threat_count INT UNSIGNED NOT NULL DEFAULT 0,
      modules_json JSON NULL,
      status ENUM('ready','generating','failed','empty') NOT NULL DEFAULT 'ready',
      error_message VARCHAR(500) NULL,
      generated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY user_threats_summaries_user_uq (user_id),
      KEY user_threats_summaries_fingerprint_idx (input_fingerprint),
      CONSTRAINT user_threats_summaries_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return true;
}
