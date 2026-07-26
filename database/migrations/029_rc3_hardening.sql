-- Sprint RC-3: system hardening — hit actions schema, promotion race guard, scan retention
SET NAMES utf8mb4;
SET @db := DATABASE();

-- 1) username_hit_actions: source_module, resolved action, module-scoped unique key
SET @has_source_module := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'username_hit_actions'
    AND COLUMN_NAME = 'source_module'
);
SET @sql := IF(
  @has_source_module = 0,
  'ALTER TABLE `username_hit_actions` ADD COLUMN `source_module` VARCHAR(64) NOT NULL DEFAULT ''username_intelligence'' AFTER `analysis_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_resolved_action := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'username_hit_actions'
    AND COLUMN_NAME = 'action'
    AND COLUMN_TYPE LIKE '%resolved%'
);
SET @sql := IF(
  @has_resolved_action = 0,
  'ALTER TABLE `username_hit_actions` MODIFY COLUMN `action` ENUM(''ignored'',''self'',''ordered'',''resolved'') NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_old_fp_unique := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'username_hit_actions'
    AND INDEX_NAME = 'username_hit_actions_user_fp'
);
SET @sql := IF(
  @has_old_fp_unique > 0,
  'ALTER TABLE `username_hit_actions` DROP INDEX `username_hit_actions_user_fp`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_mod_fp_unique := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'username_hit_actions'
    AND INDEX_NAME = 'username_hit_actions_user_mod_fp'
);
SET @sql := IF(
  @has_mod_fp_unique = 0,
  'CREATE UNIQUE INDEX `username_hit_actions_user_mod_fp` ON `username_hit_actions` (`user_id`, `source_module`, `hit_fingerprint`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) promotion_rewards: one reward row per user per promotion
SET @has_promo_user_uq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'promotion_rewards'
    AND INDEX_NAME = 'promotion_rewards_promo_user_uq'
);
SET @sql := IF(
  @has_promo_user_uq = 0,
  'CREATE UNIQUE INDEX `promotion_rewards_promo_user_uq` ON `promotion_rewards` (`promotion_id`, `user_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) digital_exposure_scans: retention metadata
SET @has_retention_days := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'digital_exposure_scans'
    AND COLUMN_NAME = 'retention_days'
);
SET @sql := IF(
  @has_retention_days = 0,
  'ALTER TABLE `digital_exposure_scans` ADD COLUMN `retention_days` INT NOT NULL DEFAULT 90 AFTER `finding_count`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_expires_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'digital_exposure_scans'
    AND COLUMN_NAME = 'expires_at'
);
SET @sql := IF(
  @has_expires_at = 0,
  'ALTER TABLE `digital_exposure_scans` ADD COLUMN `expires_at` TIMESTAMP(3) NULL AFTER `retention_days`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
