-- Admin Finanzen: payment provider secrets + API cost tracking
-- Idempotent: safe to re-run (information_schema guards).

SET NAMES utf8mb4;
SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'payment_providers'
    AND COLUMN_NAME = 'encrypted_api_key'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payment_providers` ADD COLUMN `encrypted_api_key` TEXT NULL AFTER `config_json`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'payment_providers'
    AND COLUMN_NAME = 'encrypted_webhook_secret'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payment_providers` ADD COLUMN `encrypted_webhook_secret` TEXT NULL AFTER `encrypted_api_key`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'payment_providers'
    AND COLUMN_NAME = 'environment'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payment_providers` ADD COLUMN `environment` VARCHAR(32) NOT NULL DEFAULT ''test'' AFTER `encrypted_webhook_secret`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'payment_providers'
    AND COLUMN_NAME = 'notes'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payment_providers` ADD COLUMN `notes` VARCHAR(500) NULL AFTER `environment`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `api_cost_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider_code` VARCHAR(64) NOT NULL,
  `label` VARCHAR(150) NOT NULL,
  `cost_per_request_eur` DECIMAL(12,6) NOT NULL DEFAULT 0,
  `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` VARCHAR(500) NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_cost_settings_provider_unique` (`provider_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `api_cost_settings` (`provider_code`, `label`, `cost_per_request_eur`, `notes`) VALUES
  ('serpapi', 'SerpAPI Google Search', 0.015000, 'Preis pro Suchanfrage — bei Bedarf anpassen'),
  ('gemini', 'Google Gemini', 0.002000, 'Preis pro Summarize-Call — bei Bedarf anpassen'),
  ('openai', 'OpenAI', 0.010000, 'Optional'),
  ('stripe', 'Stripe API', 0.000000, 'Transaktionsgebühren separat'),
  ('paypal', 'PayPal API', 0.000000, 'Transaktionsgebühren separat');

CREATE TABLE IF NOT EXISTS `api_usage_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider_code` VARCHAR(64) NOT NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `reference_key` VARCHAR(128) NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `request_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `unit_cost_eur` DECIMAL(12,6) NOT NULL DEFAULT 0,
  `total_cost_eur` DECIMAL(14,6) NOT NULL DEFAULT 0,
  `success` TINYINT(1) NOT NULL DEFAULT 1,
  `detail` VARCHAR(500) NULL,
  `meta_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `api_usage_events_provider_created_idx` (`provider_code`, `created_at`),
  KEY `api_usage_events_created_idx` (`created_at`),
  KEY `api_usage_events_reference_idx` (`reference_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
