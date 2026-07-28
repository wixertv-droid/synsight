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
