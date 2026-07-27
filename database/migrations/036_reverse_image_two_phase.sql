-- Reverse Image Search: two-phase flow (discovery → compare) + DB cache
SET NAMES utf8mb4;
SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_scans'
    AND COLUMN_NAME = 'serp_cache_json'
);
SET @sql := IF(
  @exists = 0,
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
