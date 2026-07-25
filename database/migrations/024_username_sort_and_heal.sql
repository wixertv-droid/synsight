-- Hotfix: Username Intelligence tab order (after Digital Leak) + column heal

UPDATE `analysis_pricing`
SET `sort_order` = 30
WHERE `analysis_key` = 'username_intelligence';

SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'username_analysis'
    AND COLUMN_NAME = 'query_count'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `username_analysis` ADD COLUMN `query_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `hit_count`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'username_analysis'
    AND COLUMN_NAME = 'settings_json'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `username_analysis` ADD COLUMN `settings_json` JSON NULL AFTER `summary`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
