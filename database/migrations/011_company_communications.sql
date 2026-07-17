-- Sprint 6E+: Company pages — contact, partner, press requests + communication settings.
-- Apply after 010_promotions.sql.

SET NAMES utf8mb4;
SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS `communication_settings` (
  `id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `contact_email` VARCHAR(255) NOT NULL DEFAULT 'contact@synsight.de',
  `press_email` VARCHAR(255) NOT NULL DEFAULT 'press@synsight.de',
  `partners_email` VARCHAR(255) NOT NULL DEFAULT 'partners@synsight.de',
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `communication_settings_singleton_chk` CHECK (`id` = 1),
  CONSTRAINT `communication_settings_updated_by_admin_fk`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `communication_settings` (`id`, `contact_email`, `press_email`, `partners_email`)
VALUES (1, 'contact@synsight.de', 'press@synsight.de', 'partners@synsight.de')
ON DUPLICATE KEY UPDATE `id` = `id`;

CREATE TABLE IF NOT EXISTS `contact_requests` (
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
  KEY `contact_requests_status_idx` (`status`),
  KEY `contact_requests_created_at_idx` (`created_at`),
  KEY `contact_requests_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `company` VARCHAR(200) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `partnership_type` VARCHAR(120) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('new','processing','answered','archived') NOT NULL DEFAULT 'new',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `partner_requests_status_idx` (`status`),
  KEY `partner_requests_created_at_idx` (`created_at`),
  KEY `partner_requests_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `press_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `medium` VARCHAR(200) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(64) NULL,
  `topic` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('new','processing','answered','archived') NOT NULL DEFAULT 'new',
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `press_requests_status_idx` (`status`),
  KEY `press_requests_created_at_idx` (`created_at`),
  KEY `press_requests_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
