-- Sprint 6D: Promotions, bonus SynCredits, and promotion audit logging.
-- Apply after 009_pricing_and_image_hardening.sql.

SET NAMES utf8mb4;
SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS `promotions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `starts_at` DATE NULL,
  `ends_at` DATE NULL,
  `time_from` TIME NULL,
  `time_to` TIME NULL,
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Europe/Berlin',
  `bonus_credits` INT UNSIGNED NOT NULL DEFAULT 0,
  `promo_code_required` TINYINT(1) NOT NULL DEFAULT 0,
  `promo_code` VARCHAR(64) NULL,
  `new_users_only` TINYINT(1) NOT NULL DEFAULT 0,
  `existing_users_only` TINYINT(1) NOT NULL DEFAULT 0,
  `single_use_per_user` TINYINT(1) NOT NULL DEFAULT 1,
  `max_participants` INT UNSIGNED NULL,
  `min_balance` INT UNSIGNED NULL,
  `budget_credits` INT UNSIGNED NULL,
  `created_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `promotions_promo_code_unique` (`promo_code`),
  KEY `promotions_active_idx` (`is_active`, `starts_at`, `ends_at`),
  CONSTRAINT `promotions_created_by_admin_fk`
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotion_rewards` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `promotion_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `credits` INT UNSIGNED NOT NULL,
  `credit_transaction_id` BIGINT UNSIGNED NULL,
  `promo_code_used` VARCHAR(64) NULL,
  `notification_shown_at` TIMESTAMP(3) NULL,
  `granted_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `promotion_rewards_promotion_id_idx` (`promotion_id`),
  KEY `promotion_rewards_user_id_idx` (`user_id`),
  KEY `promotion_rewards_notification_idx` (`user_id`, `notification_shown_at`),
  CONSTRAINT `promotion_rewards_promotion_fk`
    FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promotion_rewards_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promotion_rewards_transaction_fk`
    FOREIGN KEY (`credit_transaction_id`) REFERENCES `credit_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotion_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `promotion_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `promotion_reward_id` BIGINT UNSIGNED NULL,
  `credits` INT UNSIGNED NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `admin_id` BIGINT UNSIGNED NULL,
  `credit_transaction_id` BIGINT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `promotion_logs_promotion_id_idx` (`promotion_id`),
  KEY `promotion_logs_user_id_idx` (`user_id`),
  KEY `promotion_logs_created_at_idx` (`created_at`),
  CONSTRAINT `promotion_logs_promotion_fk`
    FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promotion_logs_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `promotion_logs_reward_fk`
    FOREIGN KEY (`promotion_reward_id`) REFERENCES `promotion_rewards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `promotion_logs_admin_fk`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `promotion_logs_transaction_fk`
    FOREIGN KEY (`credit_transaction_id`) REFERENCES `credit_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'credit_transactions'
    AND COLUMN_NAME = 'transaction_source'
    AND COLUMN_TYPE LIKE '%promotion%'
);
SET @sql := IF(
  @exists > 0,
  'SELECT 1',
  'ALTER TABLE `credit_transactions` MODIFY COLUMN `transaction_source` ENUM(''purchase'',''analysis'',''bonus'',''refund'',''admin_credit'',''admin_remove'',''adjustment'',''promotion'') NOT NULL DEFAULT ''adjustment'''
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `promotions` (
  `name`,
  `description`,
  `is_active`,
  `starts_at`,
  `ends_at`,
  `timezone`,
  `bonus_credits`,
  `promo_code_required`,
  `promo_code`,
  `new_users_only`,
  `existing_users_only`,
  `single_use_per_user`,
  `max_participants`,
  `min_balance`,
  `budget_credits`
) VALUES (
  'Willkommensbonus',
  'Automatische Gutschrift für neue Benutzer nach erfolgreicher E-Mail-Verifizierung.',
  1,
  NULL,
  NULL,
  'Europe/Berlin',
  250,
  0,
  NULL,
  1,
  0,
  1,
  NULL,
  NULL,
  NULL
) ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `bonus_credits` = VALUES(`bonus_credits`),
  `is_active` = VALUES(`is_active`);
