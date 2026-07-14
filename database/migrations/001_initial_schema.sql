-- SynSight initial schema (MySQL 8 compatible)
-- Migration: 001_initial_schema
-- Mirrors src/lib/database/schema.ts

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('pending_verification', 'active', 'suspended', 'deleted') NOT NULL DEFAULT 'pending_verification',
  `email_verified_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `last_login_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_username_unique` (`username`),
  KEY `users_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profiles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(32) NULL DEFAULT NULL,
  `company` VARCHAR(150) NULL DEFAULT NULL,
  `region` VARCHAR(100) NOT NULL DEFAULT 'EU',
  `locale` VARCHAR(10) NOT NULL DEFAULT 'de-DE',
  `public_alias` VARCHAR(100) NULL DEFAULT NULL,
  `onboarding_step` INT UNSIGNED NOT NULL DEFAULT 0,
  `onboarding_completed_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `profiles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` CHAR(36) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NULL DEFAULT NULL,
  `user_agent` TEXT NULL,
  `expires_at` TIMESTAMP(3) NOT NULL,
  `last_seen_at` TIMESTAMP(3) NOT NULL,
  `revoked_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_idx` (`user_id`),
  KEY `sessions_token_hash_idx` (`token_hash`),
  KEY `sessions_expires_at_idx` (`expires_at`),
  CONSTRAINT `sessions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- user_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `token_type` ENUM('password_reset', 'email_verification', 'api_key') NOT NULL,
  `expires_at` TIMESTAMP(3) NOT NULL,
  `used_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `user_tokens_user_id_idx` (`user_id`),
  KEY `user_tokens_token_hash_idx` (`token_hash`),
  KEY `user_tokens_expires_at_idx` (`expires_at`),
  CONSTRAINT `user_tokens_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- security_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `security_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `monitoring_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `critical_alerts` TINYINT(1) NOT NULL DEFAULT 1,
  `weekly_summary` TINYINT(1) NOT NULL DEFAULT 1,
  `ai_recommendations` TINYINT(1) NOT NULL DEFAULT 1,
  `security_score` INT UNSIGNED NULL DEFAULT NULL,
  `last_analysis_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `next_scan_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `consent_monitoring_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `security_profiles_user_id_unique` (`user_id`),
  CONSTRAINT `security_profiles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- analysis_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `analysis_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `report_type` ENUM('initial', 'scheduled', 'manual') NOT NULL,
  `status` ENUM('queued', 'running', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'queued',
  `overall_score` INT UNSIGNED NULL DEFAULT NULL,
  `signals_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `started_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `completed_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `analysis_reports_user_id_idx` (`user_id`),
  KEY `analysis_reports_status_idx` (`status`),
  CONSTRAINT `analysis_reports_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- analysis_report_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `analysis_report_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_id` BIGINT UNSIGNED NOT NULL,
  `item_type` VARCHAR(64) NOT NULL,
  `severity` ENUM('info', 'low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'info',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `source` VARCHAR(128) NULL DEFAULT NULL,
  `metadata_json` JSON NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `analysis_report_items_report_id_idx` (`report_id`),
  KEY `analysis_report_items_severity_idx` (`severity`),
  CONSTRAINT `analysis_report_items_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `analysis_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- subscription_plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `price_monthly` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `price_yearly` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
  `features_json` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscription_plans_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
  `current_period_start` TIMESTAMP(3) NOT NULL,
  `current_period_end` TIMESTAMP(3) NOT NULL,
  `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0,
  `cancelled_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `subscriptions_user_id_idx` (`user_id`),
  KEY `subscriptions_status_idx` (`status`),
  CONSTRAINT `subscriptions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subscriptions_plan_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `subscription_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'EUR',
  `status` ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `provider` VARCHAR(64) NOT NULL DEFAULT 'manual',
  `provider_reference` VARCHAR(255) NULL DEFAULT NULL,
  `paid_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `payments_user_id_idx` (`user_id`),
  KEY `payments_status_idx` (`status`),
  CONSTRAINT `payments_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_subscription_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_settings` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `theme` VARCHAR(32) NOT NULL DEFAULT 'dark',
  `notifications_json` JSON NULL,
  `locale` VARCHAR(10) NOT NULL DEFAULT 'de-DE',
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Europe/Berlin',
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_settings_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `entity_type` VARCHAR(64) NULL DEFAULT NULL,
  `entity_id` VARCHAR(64) NULL DEFAULT NULL,
  `ip_address` VARCHAR(45) NULL DEFAULT NULL,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_events_user_id_idx` (`user_id`),
  KEY `audit_events_event_type_idx` (`event_type`),
  KEY `audit_events_created_at_idx` (`created_at`),
  CONSTRAINT `audit_events_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
