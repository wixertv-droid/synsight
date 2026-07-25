-- Sprint RC-2: hardening — idempotent SynCredits, catalog cleanup

-- Unique (user_id, request_id) for idempotent consume (NULLs allowed multiple times in MySQL/MariaDB)
SET @db := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'usage_logs'
    AND INDEX_NAME = 'usage_logs_user_request_unique'
);
SET @sql := IF(
  @exists = 0,
  'CREATE UNIQUE INDEX `usage_logs_user_request_unique` ON `usage_logs` (`user_id`, `request_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Deactivate superseded alias module (Username Intelligence replaces it)
UPDATE `analysis_pricing`
SET `is_active` = 0
WHERE `analysis_key` = 'alias_analysis';

-- Username sort after Digital Leak
UPDATE `analysis_pricing`
SET `sort_order` = 30
WHERE `analysis_key` = 'username_intelligence';
