import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;

export async function ensureUsernameActionsSchema(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((error) => {
      ensurePromise = null;
      console.error("[ensureUsernameActionsSchema] failed", error);
      return false;
    });
  }
  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS username_hit_actions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      analysis_id BIGINT UNSIGNED NULL,
      hit_fingerprint VARCHAR(64) NOT NULL,
      hit_platform VARCHAR(120) NOT NULL,
      hit_url VARCHAR(1000) NULL,
      action ENUM('ignored','self','ordered') NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY username_hit_actions_user_fp (user_id, hit_fingerprint),
      KEY username_hit_actions_user_idx (user_id),
      KEY username_hit_actions_action_idx (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS synsight_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      source_module VARCHAR(64) NOT NULL DEFAULT 'username_intelligence',
      hit_fingerprint VARCHAR(64) NOT NULL,
      hit_platform VARCHAR(120) NOT NULL,
      hit_url VARCHAR(1000) NULL,
      title VARCHAR(255) NOT NULL,
      order_type VARCHAR(64) NOT NULL,
      status ENUM('offen','in_bearbeitung','erledigt','abgelehnt','vorbereitet') NOT NULL DEFAULT 'vorbereitet',
      note TEXT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY synsight_orders_user_idx (user_id),
      KEY synsight_orders_status_idx (status),
      KEY synsight_orders_module_idx (source_module)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  return true;
}
