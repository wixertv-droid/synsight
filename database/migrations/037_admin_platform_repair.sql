-- Repair blocked migrations / admin save failures (platform_settings + pricing catalog)
SET NAMES utf8mb4;
SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` INT UNSIGNED NOT NULL DEFAULT 1,
  `settings_json` JSON NOT NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `platform_settings` (`id`, `settings_json`)
VALUES (
  1,
  JSON_OBJECT(
    'imageMaxUploadMb', 12,
    'imageCompressionQuality', 82,
    'imageWebpQuality', 80,
    'imageThumbnailQuality', 72,
    'imageMaxResolution', 2048,
    'encryptOriginals', true,
    'generateAnalysisImages', true,
    'supportHoursStart', '09:00',
    'supportHoursEnd', '18:00',
    'supportTimezone', 'Europe/Berlin',
    'supportResponseText', 'In der Regel innerhalb von 1–2 Werktagen',
    'digitalLeakDefaultRetentionDays', 90
  )
);

-- Repair double-encoded JSON strings (JSON type STRING → object)
UPDATE `platform_settings`
SET `settings_json` = CAST(JSON_UNQUOTE(`settings_json`) AS JSON)
WHERE `id` = 1
  AND JSON_TYPE(`settings_json`) = 'STRING'
  AND JSON_VALID(JSON_UNQUOTE(`settings_json`));

UPDATE `platform_settings`
SET `settings_json` = JSON_SET(
  COALESCE(`settings_json`, JSON_OBJECT()),
  '$.imageMaxUploadMb',
  COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.imageMaxUploadMb')) AS SIGNED), 12),
  '$.imageCompressionQuality',
  COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.imageCompressionQuality')) AS SIGNED), 82),
  '$.imageWebpQuality',
  COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.imageWebpQuality')) AS SIGNED), 80),
  '$.imageThumbnailQuality',
  COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.imageThumbnailQuality')) AS SIGNED), 72),
  '$.imageMaxResolution',
  COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.imageMaxResolution')) AS SIGNED), 2048),
  '$.encryptOriginals',
  COALESCE(JSON_EXTRACT(`settings_json`, '$.encryptOriginals'), true),
  '$.generateAnalysisImages',
  COALESCE(JSON_EXTRACT(`settings_json`, '$.generateAnalysisImages'), true),
  '$.supportHoursStart',
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportHoursStart')), '09:00'),
  '$.supportHoursEnd',
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportHoursEnd')), '18:00'),
  '$.supportTimezone',
  COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportTimezone')), 'Europe/Berlin'),
  '$.supportResponseText',
  COALESCE(
    JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportResponseText')),
    'In der Regel innerhalb von 1–2 Werktagen'
  ),
  '$.digitalLeakDefaultRetentionDays',
  COALESCE(
    CAST(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.digitalLeakDefaultRetentionDays')) AS SIGNED),
    90
  )
)
WHERE `id` = 1;

CREATE TABLE IF NOT EXISTS `reverse_image_module_settings` (
  `id` TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `api_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `compare_url` VARCHAR(500) NOT NULL DEFAULT 'http://161.97.85.22:8000/compare',
  `similarity_threshold` DECIMAL(4,3) NOT NULL DEFAULT 0.600,
  `compare_timeout_ms` INT UNSIGNED NOT NULL DEFAULT 12000,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `reverse_image_module_settings` (`id`) VALUES (1);

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_scans'
    AND COLUMN_NAME = 'serp_cache_json'
);
SET @sql := IF(
  @exists = 0 AND (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reverse_image_scans'
  ) > 0,
  'ALTER TABLE `reverse_image_scans` ADD COLUMN `serp_cache_json` JSON NULL AFTER `expires_at`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `analysis_pricing` (
  `analysis_key`, `label`, `description`, `credits`, `is_active`, `sort_order`,
  `is_system_default`, `default_label`, `default_description`, `default_credits`
)
SELECT
  'reverse_image_discovery',
  'Reverse Image · Bildsuche',
  'SerpAPI Google Images — Namen, Alias und Benutzernamen durchsuchen.',
  12,
  1,
  118,
  1,
  'Reverse Image · Bildsuche',
  'SerpAPI Google Images — Namen, Alias und Benutzernamen durchsuchen.',
  12
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `analysis_pricing` WHERE `analysis_key` = 'reverse_image_discovery'
);

INSERT INTO `analysis_pricing` (
  `analysis_key`, `label`, `description`, `credits`, `is_active`, `sort_order`,
  `is_system_default`, `default_label`, `default_description`, `default_credits`
)
SELECT
  'reverse_image_compare',
  'Reverse Image · Gesichtsvergleich',
  'InsightFace-Abgleich ausgewählter Bildlinks gegen Referenzfotos.',
  13,
  1,
  119,
  1,
  'Reverse Image · Gesichtsvergleich',
  'InsightFace-Abgleich ausgewählter Bildlinks gegen Referenzfotos.',
  13
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `analysis_pricing` WHERE `analysis_key` = 'reverse_image_compare'
);

UPDATE `analysis_pricing`
SET
  `label` = 'Reverse Image Search (Legacy)',
  `description` = 'Veraltet — nutzen Sie Bildsuche + Gesichtsvergleich.',
  `is_active` = 0
WHERE `analysis_key` = 'reverse_image_search';
