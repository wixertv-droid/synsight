-- Sprint 6B: Admin Control Center audit metadata for SynCredits.
-- Apply after 007_syncredits.sql.

SET NAMES utf8mb4;
SET @db := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_transactions'
    AND COLUMN_NAME = 'performed_by'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_transactions` ADD COLUMN `performed_by` BIGINT UNSIGNED NULL AFTER `created_by_admin_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_transactions'
    AND COLUMN_NAME = 'reason'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_transactions` ADD COLUMN `reason` VARCHAR(500) NULL AFTER `performed_by`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_transactions'
    AND COLUMN_NAME = 'transaction_source'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_transactions` ADD COLUMN `transaction_source` ENUM(''purchase'',''analysis'',''bonus'',''refund'',''admin_credit'',''admin_remove'',''adjustment'') NOT NULL DEFAULT ''adjustment'' AFTER `reason`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `credit_transactions`
SET `performed_by` = `created_by_admin_id`
WHERE `performed_by` IS NULL
  AND `created_by_admin_id` IS NOT NULL;

UPDATE `credit_transactions`
SET `reason` = `description`
WHERE `reason` IS NULL;

UPDATE `credit_transactions`
SET `transaction_source` = CASE `type`
  WHEN 'purchase' THEN 'purchase'
  WHEN 'consume' THEN 'analysis'
  WHEN 'bonus' THEN 'bonus'
  WHEN 'refund' THEN 'refund'
  WHEN 'admin_grant' THEN 'admin_credit'
  WHEN 'admin_revoke' THEN 'admin_remove'
  ELSE 'adjustment'
END;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_transactions'
    AND INDEX_NAME = 'credit_transactions_performed_by_idx'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_transactions` ADD KEY `credit_transactions_performed_by_idx` (`performed_by`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_transactions'
    AND INDEX_NAME = 'credit_transactions_source_idx'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `credit_transactions` ADD KEY `credit_transactions_source_idx` (`transaction_source`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
