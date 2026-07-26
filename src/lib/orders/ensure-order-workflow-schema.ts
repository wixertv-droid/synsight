import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { DEFAULT_ORDER_PRICES } from "@/lib/orders/order-pricing-defaults";

let ensurePromise: Promise<boolean> | null = null;

export async function ensureOrderWorkflowSchema(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((error) => {
      ensurePromise = null;
      console.error("[ensureOrderWorkflowSchema] failed", error);
      return false;
    });
  }
  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_pricing (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      order_type VARCHAR(64) NOT NULL,
      label VARCHAR(150) NOT NULL,
      description VARCHAR(500) NULL,
      credits INT UNSIGNED NOT NULL DEFAULT 0,
      requires_vollmacht TINYINT(1) NOT NULL DEFAULT 1,
      synsight_capable TINYINT(1) NOT NULL DEFAULT 1,
      capability_hint VARCHAR(500) NULL,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      updated_by_admin_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY order_pricing_type_unique (order_type),
      KEY order_pricing_active_idx (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_vollmachten (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      order_id BIGINT UNSIGNED NOT NULL,
      status ENUM('generated','uploaded','verified') NOT NULL DEFAULT 'generated',
      template_html MEDIUMTEXT NOT NULL,
      template_path VARCHAR(500) NULL,
      signed_path VARCHAR(500) NULL,
      signed_mime VARCHAR(120) NULL,
      signed_file_name VARCHAR(255) NULL,
      generated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      uploaded_at TIMESTAMP(3) NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY order_vollmachten_order_unique (order_id),
      KEY order_vollmachten_user_idx (user_id),
      KEY order_vollmachten_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const alterColumns = [
    "ADD COLUMN credits_charged INT UNSIGNED NULL AFTER note",
    "ADD COLUMN requires_vollmacht TINYINT(1) NOT NULL DEFAULT 0 AFTER credits_charged",
    "ADD COLUMN vollmacht_id BIGINT UNSIGNED NULL AFTER requires_vollmacht",
    "ADD COLUMN capability_ok TINYINT(1) NULL AFTER vollmacht_id",
    "ADD COLUMN capability_reason VARCHAR(500) NULL AFTER capability_ok",
    "ADD COLUMN reviewed_at TIMESTAMP(3) NULL AFTER capability_reason",
    "ADD COLUMN submitted_at TIMESTAMP(3) NULL AFTER reviewed_at",
  ];
  for (const clause of alterColumns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE synsight_orders ${clause}`));
    } catch {
      /* exists */
    }
  }

  try {
    await db.execute(
      sql.raw(`
      ALTER TABLE credit_transactions
      MODIFY COLUMN transaction_source ENUM(
        'purchase','analysis','bonus','refund','admin_credit','admin_remove','adjustment','promotion','order'
      ) NOT NULL DEFAULT 'adjustment'
    `)
    );
  } catch {
    /* ignore */
  }

  for (const row of DEFAULT_ORDER_PRICES) {
    await db.execute(sql`
      INSERT INTO order_pricing
        (order_type, label, description, credits, requires_vollmacht, synsight_capable, capability_hint, sort_order, is_active)
      VALUES
        (${row.orderType}, ${row.label}, ${row.description}, ${row.credits}, ${row.requiresVollmacht ? 1 : 0}, ${row.synsightCapable ? 1 : 0}, ${row.capabilityHint}, ${row.sortOrder}, 1)
      ON DUPLICATE KEY UPDATE
        order_type = VALUES(order_type)
    `);
  }

  return true;
}
