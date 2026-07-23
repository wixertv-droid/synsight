-- Encrypted API credentials for Google Search, Gemini, etc.

CREATE TABLE IF NOT EXISTS `api_credentials` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(64) NOT NULL,
  `label` VARCHAR(150) NOT NULL,
  `encrypted_secret` TEXT NOT NULL,
  `config_json` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_success_at` TIMESTAMP(3) NULL,
  `last_error_at` TIMESTAMP(3) NULL,
  `last_error_message` TEXT NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `api_credentials_provider_unique` (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
