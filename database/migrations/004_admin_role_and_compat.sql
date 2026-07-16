-- SynSight MariaDB integration: admin role, digital_trace fields, compat views
-- Apply after 003_digital_traces_images.sql.
-- Idempotent: safe to re-run (IF NOT EXISTS / information_schema guards).

SET NAMES utf8mb4;
SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- users.role (admin | demo)
-- ---------------------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `users` ADD COLUMN `role` ENUM(''admin'',''demo'') NOT NULL DEFAULT ''demo'' AFTER `status`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_role_idx'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `users` ADD KEY `users_role_idx` (`role`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Promote seeded admin username to admin role when present
UPDATE `users` SET `role` = 'admin' WHERE `username` = 'admin';

-- ---------------------------------------------------------------------------
-- profiles.location (optional free-text; region remains the primary locale key)
-- ---------------------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'location'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `profiles` ADD COLUMN `location` VARCHAR(150) NULL DEFAULT NULL AFTER `company`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- digital_traces.source + risk_level
-- ---------------------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'digital_traces' AND COLUMN_NAME = 'source'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `digital_traces` ADD COLUMN `source` VARCHAR(128) NULL DEFAULT NULL AFTER `value`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'digital_traces'
    AND COLUMN_NAME = 'risk_level'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `digital_traces` ADD COLUMN `risk_level` ENUM(''info'',''low'',''medium'',''high'',''critical'') NOT NULL DEFAULT ''info'' AFTER `source`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'digital_traces'
    AND INDEX_NAME = 'digital_traces_risk_level_idx'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `digital_traces` ADD KEY `digital_traces_risk_level_idx` (`risk_level`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Compatibility views (domain names from architecture brief)
-- Physical tables remain profile_images / analysis_report_items / audit_events
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW `identity_images` AS
SELECT
  `id`,
  `user_id`,
  `original_path`,
  `analysis_path` AS `compressed_path`,
  `thumbnail_path`,
  `content_hash` AS `hash_sha256`,
  `mime_type`,
  `byte_size` AS `file_size`,
  `uploaded_at` AS `created_at`
FROM `profile_images`;

CREATE OR REPLACE VIEW `analysis_items` AS
SELECT
  `id`,
  `report_id`,
  `item_type` AS `category`,
  `title`,
  `description`,
  `severity` AS `risk_level`,
  `metadata_json` AS `metadata`
FROM `analysis_report_items`;

CREATE OR REPLACE VIEW `audit_logs` AS
SELECT
  `id`,
  `user_id`,
  `event_type` AS `action`,
  `ip_address`,
  `created_at`
FROM `audit_events`;
