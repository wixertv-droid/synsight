-- SynSight Sprint 5 completion: digital traces + image pipeline metadata
-- MySQL 8 compatible; apply after 002_production_identity.sql.

CREATE TABLE IF NOT EXISTS `digital_traces` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `trace_type` ENUM('website','domain','company','public_profile') NOT NULL,
  `value` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `digital_traces_user_type_value_unique` (`user_id`,`trace_type`,`value`),
  KEY `digital_traces_user_id_idx` (`user_id`),
  KEY `digital_traces_type_idx` (`trace_type`),
  CONSTRAINT `digital_traces_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `profile_images`
  ADD COLUMN `original_path` VARCHAR(500) NULL AFTER `storage_path`,
  ADD COLUMN `analysis_path` VARCHAR(500) NULL AFTER `original_path`,
  ADD COLUMN `thumbnail_path` VARCHAR(500) NULL AFTER `analysis_path`,
  ADD COLUMN `content_hash` VARCHAR(64) NULL AFTER `thumbnail_path`,
  ADD COLUMN `mime_type` VARCHAR(100) NULL AFTER `content_hash`,
  ADD COLUMN `byte_size` INT UNSIGNED NULL AFTER `mime_type`;
