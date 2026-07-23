-- Gemini / LLM token billing: extend api_cost_settings with per-token prices.
-- Idempotent: safe to re-run (information_schema guards).

SET NAMES utf8mb4;
SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'api_cost_settings'
    AND COLUMN_NAME = 'billing_mode'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `api_cost_settings` ADD COLUMN `billing_mode` VARCHAR(32) NOT NULL DEFAULT ''per_request'' AFTER `cost_per_request_eur`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'api_cost_settings'
    AND COLUMN_NAME = 'cost_per_1m_input_tokens_eur'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `api_cost_settings` ADD COLUMN `cost_per_1m_input_tokens_eur` DECIMAL(12,6) NOT NULL DEFAULT 0 AFTER `billing_mode`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'api_cost_settings'
    AND COLUMN_NAME = 'cost_per_1m_output_tokens_eur'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `api_cost_settings` ADD COLUMN `cost_per_1m_output_tokens_eur` DECIMAL(12,6) NOT NULL DEFAULT 0 AFTER `cost_per_1m_input_tokens_eur`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Gemini 3.6 Flash Standard Pay-As-You-Go (USD list → EUR @ 0.92):
-- Input $1.50 / 1M → €1.38 | Output (inkl. Thinking) $7.50 / 1M → €6.90
-- Formel: (prompt/1M)*1.50 + (candidates/1M)*7.50  [USD], dann × EUR-Kurs
UPDATE `api_cost_settings`
SET
  `billing_mode` = 'per_token',
  `cost_per_1m_input_tokens_eur` = 1.380000,
  `cost_per_1m_output_tokens_eur` = 6.900000,
  `notes` = 'gemini-3.6-flash Standard: $1.50 Input / $7.50 Output pro 1M Tokens → EUR @0.92'
WHERE `provider_code` = 'gemini';
