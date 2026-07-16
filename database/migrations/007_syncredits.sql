-- SynSight Sprint 6A: SynCredits ledger, packages, providers, invoices, usage
-- Idempotent where practical (IF NOT EXISTS). Apply after 006.

SET NAMES utf8mb4;
SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- payment_providers (Stripe, PayPal, Apple Pay, Google Pay, SEPA, …)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_providers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `supports_checkout` TINYINT(1) NOT NULL DEFAULT 1,
  `config_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_providers_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `payment_providers` (`code`, `name`, `is_active`, `supports_checkout`, `config_json`)
VALUES
  ('manual', 'Manuell / Test', 1, 0, JSON_OBJECT('mode', 'instant')),
  ('stripe', 'Stripe', 0, 1, NULL),
  ('paypal', 'PayPal', 0, 1, NULL),
  ('apple_pay', 'Apple Pay', 0, 1, NULL),
  ('google_pay', 'Google Pay', 0, 1, NULL),
  ('sepa', 'SEPA Lastschrift', 0, 1, NULL)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`);

-- ---------------------------------------------------------------------------
-- credit_packages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `credit_packages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `credits` INT UNSIGNED NOT NULL,
  `bonus_credits` INT UNSIGNED NOT NULL DEFAULT 0,
  `price_cents` INT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
  `badge` VARCHAR(64) NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `credit_packages_code_unique` (`code`),
  KEY `credit_packages_active_idx` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `credit_packages`
  (`code`, `name`, `credits`, `bonus_credits`, `price_cents`, `currency`, `badge`, `sort_order`, `is_active`)
VALUES
  ('pack_500', 'Starter', 500, 0, 500, 'EUR', NULL, 10, 1),
  ('pack_1700', 'Focus', 1500, 200, 1500, 'EUR', '+200 Bonus', 20, 1),
  ('pack_3600', 'Protect', 3000, 600, 3000, 'EUR', '+600 Bonus', 30, 1),
  ('pack_7800', 'Command', 6000, 1800, 6000, 'EUR', '+1800 Bonus', 40, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `credits` = VALUES(`credits`),
  `bonus_credits` = VALUES(`bonus_credits`),
  `price_cents` = VALUES(`price_cents`),
  `badge` = VALUES(`badge`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);

-- ---------------------------------------------------------------------------
-- credit_accounts (1:1 user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `credit_accounts` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `balance` INT NOT NULL DEFAULT 0,
  `lifetime_purchased` INT UNSIGNED NOT NULL DEFAULT 0,
  `lifetime_spent` INT UNSIGNED NOT NULL DEFAULT 0,
  `lifetime_bonus` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `credit_accounts_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- credit_transactions (immutable ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `credit_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM(
    'purchase',
    'consume',
    'bonus',
    'admin_grant',
    'admin_revoke',
    'refund',
    'adjustment'
  ) NOT NULL,
  `amount` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `analysis_key` VARCHAR(64) NULL,
  `package_code` VARCHAR(64) NULL,
  `payment_id` BIGINT UNSIGNED NULL,
  `usage_log_id` BIGINT UNSIGNED NULL,
  `description` VARCHAR(255) NOT NULL,
  `metadata_json` JSON NULL,
  `created_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `credit_transactions_user_id_idx` (`user_id`),
  KEY `credit_transactions_type_idx` (`type`),
  KEY `credit_transactions_created_at_idx` (`created_at`),
  KEY `credit_transactions_payment_id_idx` (`payment_id`),
  CONSTRAINT `credit_transactions_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `payment_id` BIGINT UNSIGNED NULL,
  `invoice_number` VARCHAR(64) NOT NULL,
  `amount_cents` INT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
  `status` ENUM('draft', 'open', 'paid', 'void', 'refunded') NOT NULL DEFAULT 'draft',
  `issued_at` TIMESTAMP(3) NULL,
  `paid_at` TIMESTAMP(3) NULL,
  `pdf_path` VARCHAR(500) NULL,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_invoice_number_unique` (`invoice_number`),
  KEY `invoices_user_id_idx` (`user_id`),
  KEY `invoices_payment_id_idx` (`payment_id`),
  CONSTRAINT `invoices_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- usage_logs (analysis consumption audit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usage_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `analysis_key` VARCHAR(64) NOT NULL,
  `credits_charged` INT UNSIGNED NOT NULL,
  `status` ENUM('reserved', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'completed',
  `transaction_id` BIGINT UNSIGNED NULL,
  `request_id` VARCHAR(64) NULL,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `usage_logs_user_id_idx` (`user_id`),
  KEY `usage_logs_analysis_key_idx` (`analysis_key`),
  KEY `usage_logs_created_at_idx` (`created_at`),
  CONSTRAINT `usage_logs_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Extend existing payments for credit package purchases
-- ---------------------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'purpose'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payments` ADD COLUMN `purpose` ENUM(''subscription'',''credits'',''other'') NOT NULL DEFAULT ''subscription'' AFTER `subscription_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'package_id'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payments` ADD COLUMN `package_id` BIGINT UNSIGNED NULL AFTER `purpose`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'provider_id'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payments` ADD COLUMN `provider_id` BIGINT UNSIGNED NULL AFTER `provider`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'invoice_id'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payments` ADD COLUMN `invoice_id` BIGINT UNSIGNED NULL AFTER `provider_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'amount_cents'
);
SET @sql := IF(
  @exists = 0,
  'ALTER TABLE `payments` ADD COLUMN `amount_cents` INT UNSIGNED NULL AFTER `amount`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill credit accounts for existing users
INSERT INTO `credit_accounts` (`user_id`, `balance`)
SELECT `id`, 0 FROM `users`
WHERE `id` NOT IN (SELECT `user_id` FROM `credit_accounts`)
ON DUPLICATE KEY UPDATE `user_id` = VALUES(`user_id`);
