import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;

/**
 * Heals `support_requests` + public mailbox columns when migration 026
 * has not been applied yet (common cause of admin inbox 500 / ticket 500).
 */
export async function ensureSupportCommunicationsSchema(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((error) => {
      ensurePromise = null;
      console.error("[ensureSupportCommunicationsSchema] failed", error);
      return false;
    });
  }
  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS support_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      company VARCHAR(200) NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NULL,
      subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('new','processing','answered','archived') NOT NULL DEFAULT 'new',
      ip_address VARCHAR(45) NULL,
      user_agent VARCHAR(500) NULL,
      admin_notes TEXT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY support_requests_status_idx (status),
      KEY support_requests_created_at_idx (created_at),
      KEY support_requests_email_idx (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    await db.execute(sql`
      ALTER TABLE communication_settings
      ADD COLUMN support_email VARCHAR(255) NOT NULL DEFAULT 'support@synsight.de' AFTER partners_email
    `);
  } catch {
    /* column already exists */
  }

  try {
    await db.execute(sql`
      ALTER TABLE communication_settings
      ADD COLUMN privacy_email VARCHAR(255) NOT NULL DEFAULT 'datenschutz@synsight.de' AFTER support_email
    `);
  } catch {
    /* column already exists */
  }

  return true;
}
