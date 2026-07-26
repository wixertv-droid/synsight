-- Desk UX: Vollmacht reject + customer-visible staff message
SET NAMES utf8mb4;

ALTER TABLE `order_vollmachten`
  MODIFY COLUMN `status` ENUM('generated','uploaded','verified','rejected') NOT NULL DEFAULT 'generated';

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'order_vollmachten'
    AND COLUMN_NAME = 'reject_reason'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE `order_vollmachten`
     ADD COLUMN `reject_reason` VARCHAR(1000) NULL AFTER `signed_file_name`,
     ADD COLUMN `rejected_at` TIMESTAMP(3) NULL AFTER `reject_reason`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col2 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'synsight_orders'
    AND COLUMN_NAME = 'staff_message'
);
SET @sql2 := IF(@col2 = 0,
  'ALTER TABLE `synsight_orders`
     ADD COLUMN `staff_message` VARCHAR(1000) NULL AFTER `note`',
  'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
