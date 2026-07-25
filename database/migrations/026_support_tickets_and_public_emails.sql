-- Support tickets + public contact emails (support / privacy)
SET NAMES utf8mb4;
SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS `support_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `company` VARCHAR(200) NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(64) NULL,
  `subject` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('new','processing','answered','archived') NOT NULL DEFAULT 'new',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `support_requests_status_idx` (`status`),
  KEY `support_requests_created_at_idx` (`created_at`),
  KEY `support_requests_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add support/privacy mailbox columns when missing
SET @has_support := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'communication_settings'
    AND COLUMN_NAME = 'support_email'
);
SET @sql := IF(
  @has_support = 0,
  'ALTER TABLE `communication_settings` ADD COLUMN `support_email` VARCHAR(255) NOT NULL DEFAULT ''support@synsight.de'' AFTER `partners_email`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_privacy := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'communication_settings'
    AND COLUMN_NAME = 'privacy_email'
);
SET @sql := IF(
  @has_privacy = 0,
  'ALTER TABLE `communication_settings` ADD COLUMN `privacy_email` VARCHAR(255) NOT NULL DEFAULT ''datenschutz@synsight.de'' AFTER `support_email`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `communication_settings`
SET
  `support_email` = COALESCE(NULLIF(`support_email`, ''), 'support@synsight.de'),
  `privacy_email` = COALESCE(NULLIF(`privacy_email`, ''), 'datenschutz@synsight.de')
WHERE `id` = 1;
