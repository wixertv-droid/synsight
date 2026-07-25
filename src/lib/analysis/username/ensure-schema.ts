import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";

let ensurePromise: Promise<boolean> | null = null;

export async function ensureUsernameSchema(): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((error) => {
      ensurePromise = null;
      console.error("[ensureUsernameSchema] failed", error);
      return false;
    });
  }
  return ensurePromise;
}

async function runEnsure(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS username_analysis (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      subject_username VARCHAR(255) NULL,
      subject_name VARCHAR(255) NULL,
      started_at TIMESTAMP(3) NULL,
      completed_at TIMESTAMP(3) NULL,
      identity_score INT UNSIGNED NOT NULL DEFAULT 0,
      risk_score INT UNSIGNED NOT NULL DEFAULT 0,
      confidence INT UNSIGNED NOT NULL DEFAULT 0,
      hit_count INT UNSIGNED NOT NULL DEFAULT 0,
      query_count INT UNSIGNED NOT NULL DEFAULT 0,
      summary TEXT NULL,
      settings_json JSON NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY username_analysis_user_id_idx (user_id),
      KEY username_analysis_created_at_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS username_hits (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      analysis_id BIGINT UNSIGNED NOT NULL,
      platform VARCHAR(120) NOT NULL,
      category VARCHAR(64) NOT NULL DEFAULT 'Sonstige',
      profile_name VARCHAR(255) NULL,
      profile_url VARCHAR(500) NULL,
      title VARCHAR(500) NULL,
      snippet TEXT NULL,
      visible_info_json JSON NULL,
      identity_score INT UNSIGNED NOT NULL DEFAULT 0,
      confidence INT UNSIGNED NOT NULL DEFAULT 0,
      risk_level VARCHAR(16) NOT NULL DEFAULT 'low',
      first_seen VARCHAR(64) NULL,
      query_used VARCHAR(500) NULL,
      logo_key VARCHAR(64) NULL,
      meta_json JSON NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY username_hits_analysis_id_idx (analysis_id),
      KEY username_hits_platform_idx (platform),
      KEY username_hits_confidence_idx (confidence)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS username_reports (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      analysis_id BIGINT UNSIGNED NOT NULL,
      report_json JSON NOT NULL,
      management_summary TEXT NULL,
      identity_graph_json JSON NULL,
      platform_overview_json JSON NULL,
      timeline_json JSON NULL,
      heatmap_json JSON NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY username_reports_analysis_id_unique (analysis_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS username_ai_reports (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      analysis_id BIGINT UNSIGNED NOT NULL,
      model VARCHAR(120) NULL,
      prompt_hash VARCHAR(64) NULL,
      content MEDIUMTEXT NOT NULL,
      token_usage_json JSON NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY username_ai_reports_analysis_id_idx (analysis_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS username_cost_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      analysis_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NULL,
      serpapi_requests INT UNSIGNED NOT NULL DEFAULT 0,
      serpapi_cost_eur DECIMAL(14,6) NOT NULL DEFAULT 0,
      gemini_tokens INT UNSIGNED NOT NULL DEFAULT 0,
      gemini_cost_eur DECIMAL(14,6) NOT NULL DEFAULT 0,
      syn_credits INT UNSIGNED NOT NULL DEFAULT 0,
      total_api_cost_eur DECIMAL(14,6) NOT NULL DEFAULT 0,
      estimated_profit_eur DECIMAL(14,6) NOT NULL DEFAULT 0,
      meta_json JSON NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY username_cost_logs_analysis_id_idx (analysis_id),
      KEY username_cost_logs_user_id_idx (user_id),
      KEY username_cost_logs_created_at_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS username_module_settings (
      id INT UNSIGNED NOT NULL DEFAULT 1,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      api_enabled TINYINT(1) NOT NULL DEFAULT 1,
      max_queries INT UNSIGNED NOT NULL DEFAULT 8,
      countries VARCHAR(255) NOT NULL DEFAULT 'de',
      language VARCHAR(16) NOT NULL DEFAULT 'de',
      result_limit INT UNSIGNED NOT NULL DEFAULT 40,
      confidence_min INT UNSIGNED NOT NULL DEFAULT 60,
      syn_credits INT UNSIGNED NOT NULL DEFAULT 10,
      serpapi_cost_eur DECIMAL(14,6) NOT NULL DEFAULT 0.023000,
      gemini_cost_eur DECIMAL(14,6) NOT NULL DEFAULT 0.002000,
      markup_percent DECIMAL(8,2) NOT NULL DEFAULT 100.00,
      min_profit_eur DECIMAL(14,6) NOT NULL DEFAULT 0.050000,
      credit_value_eur DECIMAL(14,6) NOT NULL DEFAULT 0.010000,
      updated_by_admin_id BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(sql`
    INSERT INTO username_module_settings
      (id, is_active, api_enabled, max_queries, countries, language,
       result_limit, confidence_min, syn_credits, serpapi_cost_eur,
       gemini_cost_eur, markup_percent, min_profit_eur, credit_value_eur)
    VALUES
      (1, 1, 1, 8, 'de', 'de', 40, 60, 10, 0.023000, 0.002000, 100.00, 0.050000, 0.010000)
    ON DUPLICATE KEY UPDATE id = VALUES(id)
  `);

  return true;
}
