-- Manual repair: pricing catalog + scan tables for Digital Leak & Exposure.
-- Run on the VPS:
--   mysql -u synsight -p synsight < database/fixes/repair_digital_leak_catalog.sql
-- Or:
--   DATABASE_URL='mysql://...' npm run db:ensure-catalog

CREATE TABLE IF NOT EXISTS `digital_exposure_scans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `started_at` TIMESTAMP(3) NULL,
  `completed_at` TIMESTAMP(3) NULL,
  `risk_score` INT UNSIGNED NOT NULL DEFAULT 0,
  `summary` TEXT NULL,
  `subject_name` VARCHAR(255) NULL,
  `email_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `phone_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `finding_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `digital_exposure_scans_user_id_idx` (`user_id`),
  KEY `digital_exposure_scans_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `digital_exposure_results` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `scan_id` BIGINT UNSIGNED NOT NULL,
  `type` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `risk_level` VARCHAR(16) NOT NULL DEFAULT 'low',
  `source_name` VARCHAR(255) NULL,
  `source_date` VARCHAR(32) NULL,
  `recommendation` TEXT NULL,
  `source_url` VARCHAR(500) NULL,
  `identifier_masked` VARCHAR(255) NULL,
  `data_classes_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `digital_exposure_results_scan_id_idx` (`scan_id`),
  KEY `digital_exposure_results_type_idx` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `api_usage_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(64) NOT NULL,
  `request_type` VARCHAR(64) NOT NULL,
  `cost_eur` DECIMAL(14,6) NOT NULL DEFAULT 0,
  `user_id` BIGINT UNSIGNED NULL,
  `analysis_id` BIGINT UNSIGNED NULL,
  `analysis_key` VARCHAR(64) NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 1,
  `detail` VARCHAR(500) NULL,
  `meta_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `api_usage_logs_provider_created_idx` (`provider`, `created_at`),
  KEY `api_usage_logs_user_id_idx` (`user_id`),
  KEY `api_usage_logs_analysis_id_idx` (`analysis_id`),
  KEY `api_usage_logs_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `analysis_pricing`
  (`analysis_key`, `label`, `description`, `credits`, `sort_order`,
   `is_active`, `is_system_default`, `default_label`,
   `default_description`, `default_credits`)
VALUES
  (
    'digital_leak_exposure',
    'Digital Leak & Exposure Scan',
    'Öffentlich bekannte Datenlecks und kompromittierte Identifikatoren (E-Mail & Telefon).',
    8,
    25,
    1,
    1,
    'Digital Leak & Exposure Scan',
    'Öffentlich bekannte Datenlecks und kompromittierte Identifikatoren (E-Mail & Telefon).',
    8
  )
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `credits` = VALUES(`credits`),
  `sort_order` = VALUES(`sort_order`),
  `default_label` = VALUES(`default_label`),
  `default_description` = VALUES(`default_description`),
  `default_credits` = VALUES(`default_credits`),
  `is_system_default` = 1,
  `is_active` = 1;

UPDATE `analysis_pricing`
SET `is_active` = 0
WHERE `analysis_key` IN ('phone_analysis', 'email_analysis');

INSERT INTO `api_cost_settings`
  (`provider_code`, `label`, `cost_per_request_eur`, `notes`, `is_active`)
VALUES
  (
    'dehashed',
    'DeHashed.com',
    0.000000,
    'DeHashed Search API — optional cost override',
    1
  )
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `notes` = VALUES(`notes`),
  `is_active` = 1;

SELECT analysis_key, credits, is_active
FROM analysis_pricing
WHERE analysis_key IN ('digital_leak_exposure', 'phone_analysis', 'email_analysis')
ORDER BY analysis_key;

SHOW TABLES LIKE 'digital_exposure%';
