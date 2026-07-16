-- SynSight Sprint 5D: voluntary identity profile fields
-- Idempotent: safe to re-run.

SET NAMES utf8mb4;
SET @db := DATABASE();

-- profiles.birth_date
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'birth_date'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `profiles` ADD COLUMN `birth_date` DATE NULL DEFAULT NULL AFTER `last_name`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- profiles.gender
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'gender'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `profiles` ADD COLUMN `gender` ENUM(''female'',''male'',''non_binary'',''prefer_not_to_say'',''other'') NULL DEFAULT NULL AFTER `birth_date`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- profiles.address_line
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'address_line'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `profiles` ADD COLUMN `address_line` VARCHAR(255) NULL DEFAULT NULL AFTER `location`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- profiles.previous_locations (JSON array of strings)
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'previous_locations'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `profiles` ADD COLUMN `previous_locations` JSON NULL AFTER `address_line`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- social_accounts.account_status
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND COLUMN_NAME = 'account_status'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `social_accounts` ADD COLUMN `account_status` ENUM(''active'',''former'',''unknown'') NOT NULL DEFAULT ''active'' AFTER `profile_url`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'social_accounts' AND INDEX_NAME = 'social_accounts_status_idx'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `social_accounts` ADD KEY `social_accounts_status_idx` (`account_status`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
