-- Reverse Image Search — SerpAPI Google Images + InsightFace similarity pipeline

CREATE TABLE IF NOT EXISTS `reverse_image_scans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `started_at` TIMESTAMP(3) NULL,
  `completed_at` TIMESTAMP(3) NULL,
  `risk_score` INT UNSIGNED NOT NULL DEFAULT 0,
  `summary` TEXT NULL,
  `subject_name` VARCHAR(255) NULL,
  `query_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `candidate_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `match_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `reference_image_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `retention_days` INT UNSIGNED NOT NULL DEFAULT 30,
  `expires_at` TIMESTAMP(3) NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `reverse_image_scans_user_id_idx` (`user_id`),
  KEY `reverse_image_scans_created_at_idx` (`created_at`),
  CONSTRAINT `reverse_image_scans_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reverse_image_hits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `scan_id` BIGINT UNSIGNED NOT NULL,
  `query` VARCHAR(255) NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `source_url` VARCHAR(1000) NULL,
  `image_url` VARCHAR(1000) NOT NULL,
  `similarity` DECIMAL(6,5) NOT NULL DEFAULT 0,
  `reference_image_type` VARCHAR(32) NULL,
  `risk_level` VARCHAR(16) NOT NULL DEFAULT 'medium',
  `stored_path` VARCHAR(500) NULL,
  `thumbnail_path` VARCHAR(500) NULL,
  `meta_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `reverse_image_hits_scan_id_idx` (`scan_id`),
  KEY `reverse_image_hits_similarity_idx` (`similarity`),
  CONSTRAINT `reverse_image_hits_scan_id_fk`
    FOREIGN KEY (`scan_id`) REFERENCES `reverse_image_scans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure pricing catalog row is active
INSERT INTO `analysis_pricing` (
  `analysis_key`, `label`, `description`, `credits`, `is_active`, `sort_order`,
  `is_system_default`, `default_label`, `default_description`, `default_credits`
)
SELECT
  'reverse_image_search',
  'Reverse Image Search',
  'Visuelle Treffersuche über Google Images (SerpAPI) mit InsightFace-Abgleich.',
  25,
  1,
  90,
  1,
  'Reverse Image Search',
  'Visuelle Treffersuche über Google Images (SerpAPI) mit InsightFace-Abgleich.',
  25
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `analysis_pricing` WHERE `analysis_key` = 'reverse_image_search'
);

UPDATE `analysis_pricing`
SET
  `label` = 'Reverse Image Search',
  `description` = 'Visuelle Treffersuche über Google Images (SerpAPI) mit InsightFace-Abgleich.',
  `default_label` = 'Reverse Image Search',
  `default_description` = 'Visuelle Treffersuche über Google Images (SerpAPI) mit InsightFace-Abgleich.',
  `default_credits` = 25,
  `is_system_default` = 1
WHERE `analysis_key` = 'reverse_image_search';
