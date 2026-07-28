SET NAMES utf8mb4;

SET @db := DATABASE();
SET @exists_public_scan := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'public_scan_active'
);
SET @sql_public_scan := IF(
  @exists_public_scan = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `public_scan_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active`',
  'SELECT 1'
);
PREPARE stmt_public_scan FROM @sql_public_scan; EXECUTE stmt_public_scan; DEALLOCATE PREPARE stmt_public_scan;

SET @exists_face_verification := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'face_verification_active'
);
SET @sql_face_verification := IF(
  @exists_face_verification = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `face_verification_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `public_scan_active`',
  'SELECT 1'
);
PREPARE stmt_face_verification FROM @sql_face_verification; EXECUTE stmt_face_verification; DEALLOCATE PREPARE stmt_face_verification;

SET @exists_max_pages := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'max_pages_per_query'
);
SET @sql_max_pages := IF(
  @exists_max_pages = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `max_pages_per_query` INT UNSIGNED NOT NULL DEFAULT 2 AFTER `api_enabled`',
  'SELECT 1'
);
PREPARE stmt_max_pages FROM @sql_max_pages; EXECUTE stmt_max_pages; DEALLOCATE PREPARE stmt_max_pages;

SET @exists_max_images := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'max_images_per_query'
);
SET @sql_max_images := IF(
  @exists_max_images = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `max_images_per_query` INT UNSIGNED NOT NULL DEFAULT 100 AFTER `max_pages_per_query`',
  'SELECT 1'
);
PREPARE stmt_max_images FROM @sql_max_images; EXECUTE stmt_max_images; DEALLOCATE PREPARE stmt_max_images;

SET @exists_identity_threshold := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'identity_score_threshold'
);
SET @sql_identity_threshold := IF(
  @exists_identity_threshold = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `identity_score_threshold` INT UNSIGNED NOT NULL DEFAULT 45 AFTER `max_images_per_query`',
  'SELECT 1'
);
PREPARE stmt_identity_threshold FROM @sql_identity_threshold; EXECUTE stmt_identity_threshold; DEALLOCATE PREPARE stmt_identity_threshold;

SET @exists_domain_min := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'domain_relevance_min'
);
SET @sql_domain_min := IF(
  @exists_domain_min = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `domain_relevance_min` INT UNSIGNED NOT NULL DEFAULT 35 AFTER `identity_score_threshold`',
  'SELECT 1'
);
PREPARE stmt_domain_min FROM @sql_domain_min; EXECUTE stmt_domain_min; DEALLOCATE PREPARE stmt_domain_min;

SET @exists_ai_filter := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'ai_relevance_filter'
);
SET @sql_ai_filter := IF(
  @exists_ai_filter = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `ai_relevance_filter` TINYINT(1) NOT NULL DEFAULT 1 AFTER `domain_relevance_min`',
  'SELECT 1'
);
PREPARE stmt_ai_filter FROM @sql_ai_filter; EXECUTE stmt_ai_filter; DEALLOCATE PREPARE stmt_ai_filter;

SET @exists_min_confidence := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'reverse_image_module_settings'
    AND COLUMN_NAME = 'min_confidence'
);
SET @sql_min_confidence := IF(
  @exists_min_confidence = 0,
  'ALTER TABLE `reverse_image_module_settings` ADD COLUMN `min_confidence` INT UNSIGNED NOT NULL DEFAULT 55 AFTER `ai_relevance_filter`',
  'SELECT 1'
);
PREPARE stmt_min_confidence FROM @sql_min_confidence; EXECUTE stmt_min_confidence; DEALLOCATE PREPARE stmt_min_confidence;

INSERT INTO `analysis_pricing` (
  `analysis_key`, `label`, `description`, `credits`, `is_active`, `sort_order`,
  `is_system_default`, `default_label`, `default_description`, `default_credits`
)
SELECT
  'public_image_exposure_scan',
  'Public Image Exposure Scan',
  'Öffentliche Bildquellen via Suchmaschine finden, gruppieren und kontextualisieren.',
  12,
  1,
  118,
  1,
  'Public Image Exposure Scan',
  'Öffentliche Bildquellen via Suchmaschine finden, gruppieren und kontextualisieren.',
  12
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `analysis_pricing` WHERE `analysis_key` = 'public_image_exposure_scan'
);

INSERT INTO `analysis_pricing` (
  `analysis_key`, `label`, `description`, `credits`, `is_active`, `sort_order`,
  `is_system_default`, `default_label`, `default_description`, `default_credits`
)
SELECT
  'face_identity_verification',
  'Face Identity Verification',
  'InsightFace-Abgleich — 1 SynCredit pro ausgewähltem Bild.',
  1,
  1,
  119,
  1,
  'Face Identity Verification',
  'InsightFace-Abgleich — 1 SynCredit pro ausgewähltem Bild.',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `analysis_pricing` WHERE `analysis_key` = 'face_identity_verification'
);

UPDATE `analysis_pricing`
SET
  `label` = 'Public Image Exposure Scan (Legacy)',
  `description` = 'Veraltet — nutzen Sie Public Image Exposure Scan.',
  `is_active` = 0
WHERE `analysis_key` = 'reverse_image_discovery';

UPDATE `analysis_pricing`
SET
  `label` = 'Face Identity Verification (Legacy)',
  `description` = 'Veraltet — nutzen Sie Face Identity Verification.',
  `is_active` = 0
WHERE `analysis_key` = 'reverse_image_compare';

UPDATE `analysis_pricing`
SET
  `label` = 'Reverse Image Search (Legacy)',
  `description` = 'Veraltet — nutzen Sie Public Image Exposure Scan + Face Identity Verification.',
  `is_active` = 0
WHERE `analysis_key` = 'reverse_image_search';
