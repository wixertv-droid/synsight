-- Sprint 6C: database-owned pricing catalog + image uniqueness hardening.
-- Apply after 008_admin_control_center.sql.

SET NAMES utf8mb4;
SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS `analysis_pricing` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `analysis_key` VARCHAR(64) NOT NULL,
  `label` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) NULL,
  `credits` INT UNSIGNED NOT NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_system_default` TINYINT(1) NOT NULL DEFAULT 0,
  `default_label` VARCHAR(150) NULL,
  `default_description` VARCHAR(500) NULL,
  `default_credits` INT UNSIGNED NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `analysis_pricing_key_unique` (`analysis_key`),
  KEY `analysis_pricing_active_idx` (`is_active`, `sort_order`),
  KEY `analysis_pricing_updated_by_idx` (`updated_by_admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `analysis_pricing`
  (`analysis_key`, `label`, `description`, `credits`, `sort_order`,
   `is_active`, `is_system_default`, `default_label`,
   `default_description`, `default_credits`)
VALUES
  ('google_search', 'Google Suche', 'Öffentliche Webtreffer zu Identitätssignalen.', 2, 10, 1, 1, 'Google Suche', 'Öffentliche Webtreffer zu Identitätssignalen.', 2),
  ('phone_analysis', 'Telefonnummer', 'Telefonnummern- und Expositionsanalyse.', 6, 20, 1, 1, 'Telefonnummer', 'Telefonnummern- und Expositionsanalyse.', 6),
  ('email_analysis', 'Email Analyse', 'E-Mail-Exposition und Leak-Signale.', 6, 30, 1, 1, 'Email Analyse', 'E-Mail-Exposition und Leak-Signale.', 6),
  ('website_analysis', 'Website Analyse', 'Website-Signale und öffentliche Zuordnungen.', 5, 40, 1, 1, 'Website Analyse', 'Website-Signale und öffentliche Zuordnungen.', 5),
  ('domain_analysis', 'Domain Analyse', 'Domain-Risiko und Exposition.', 5, 50, 1, 1, 'Domain Analyse', 'Domain-Risiko und Exposition.', 5),
  ('alias_analysis', 'Alias Analyse', 'Alias- und Benutzernamen-Korrelation.', 8, 60, 1, 1, 'Alias Analyse', 'Alias- und Benutzernamen-Korrelation.', 8),
  ('social_media', 'Social Media Analyse', 'Profil- und Alias-Korrelation.', 10, 70, 1, 1, 'Social Media Analyse', 'Profil- und Alias-Korrelation.', 10),
  ('person_search', 'Personensuche', 'Personenbezogene Spurensuche.', 15, 80, 1, 1, 'Personensuche', 'Personenbezogene Spurensuche.', 15),
  ('reverse_image_search', 'Reverse Image Search', 'Bildbasierte Wiedererkennung.', 25, 90, 1, 1, 'Reverse Image Search', 'Bildbasierte Wiedererkennung.', 25),
  ('ai_summary', 'KI-Zusammenfassung', 'Verdichtete Risikobewertung.', 20, 100, 1, 1, 'KI-Zusammenfassung', 'Verdichtete Risikobewertung.', 20),
  ('pdf_report', 'PDF Report', 'Exportierbarer Bericht.', 10, 110, 1, 1, 'PDF Report', 'Exportierbarer Bericht.', 10),
  ('deep_intelligence', 'Deep Intelligence Analyse', 'Tiefe Korrelation über mehrere Quellen.', 60, 120, 1, 1, 'Deep Intelligence Analyse', 'Tiefe Korrelation über mehrere Quellen.', 60),
  ('full_identity_analysis', 'Komplette Digitale Identitätsanalyse', 'Vollständige digitale Identitätsprüfung.', 100, 130, 1, 1, 'Komplette Digitale Identitätsanalyse', 'Vollständige digitale Identitätsprüfung.', 100)
ON DUPLICATE KEY UPDATE
  `is_system_default` = 1,
  `default_label` = VALUES(`default_label`),
  `default_description` = VALUES(`default_description`),
  `default_credits` = VALUES(`default_credits`);

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_packages'
    AND COLUMN_NAME = 'default_credits'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_packages` ADD COLUMN `default_credits` INT UNSIGNED NULL AFTER `is_active`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_packages'
    AND COLUMN_NAME = 'default_bonus_credits'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_packages` ADD COLUMN `default_bonus_credits` INT UNSIGNED NULL AFTER `default_credits`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_packages'
    AND COLUMN_NAME = 'default_price_cents'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_packages` ADD COLUMN `default_price_cents` INT UNSIGNED NULL AFTER `default_bonus_credits`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_packages'
    AND COLUMN_NAME = 'is_popular'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_packages` ADD COLUMN `is_popular` TINYINT(1) NOT NULL DEFAULT 0 AFTER `default_price_cents`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_packages'
    AND COLUMN_NAME = 'updated_by_admin_id'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_packages` ADD COLUMN `updated_by_admin_id` BIGINT UNSIGNED NULL AFTER `is_popular`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `credit_packages`
SET
  `default_credits` = CASE `code`
    WHEN 'pack_500' THEN 500
    WHEN 'pack_1700' THEN 1500
    WHEN 'pack_3600' THEN 3000
    WHEN 'pack_7800' THEN 6000
    ELSE `default_credits`
  END,
  `default_bonus_credits` = CASE `code`
    WHEN 'pack_500' THEN 0
    WHEN 'pack_1700' THEN 200
    WHEN 'pack_3600' THEN 600
    WHEN 'pack_7800' THEN 1800
    ELSE `default_bonus_credits`
  END,
  `default_price_cents` = CASE `code`
    WHEN 'pack_500' THEN 500
    WHEN 'pack_1700' THEN 1500
    WHEN 'pack_3600' THEN 3000
    WHEN 'pack_7800' THEN 6000
    ELSE `default_price_cents`
  END,
  `is_popular` = CASE WHEN `code` = 'pack_3600' THEN 1 ELSE 0 END
WHERE `code` IN ('pack_500', 'pack_1700', 'pack_3600', 'pack_7800');

-- Keep only the latest row per image type before adding uniqueness.
DELETE older
FROM `profile_images` AS older
INNER JOIN `profile_images` AS newer
  ON older.`user_id` = newer.`user_id`
  AND older.`image_type` = newer.`image_type`
  AND older.`id` < newer.`id`;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'profile_images'
    AND INDEX_NAME = 'profile_images_user_type_unique'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `profile_images` ADD UNIQUE KEY `profile_images_user_type_unique` (`user_id`, `image_type`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
