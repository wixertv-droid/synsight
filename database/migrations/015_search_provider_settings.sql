-- Search provider settings (SerpAPI first; multi-provider ready)

CREATE TABLE IF NOT EXISTS `search_provider_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(64) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `encrypted_api_key` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'unknown',
  `last_check_at` TIMESTAMP(3) NULL,
  `last_success_at` TIMESTAMP(3) NULL,
  `last_error_at` TIMESTAMP(3) NULL,
  `last_error_message` TEXT NULL,
  `average_response_time_ms` INT UNSIGNED NOT NULL DEFAULT 0,
  `daily_requests` INT UNSIGNED NOT NULL DEFAULT 0,
  `daily_requests_date` DATE NULL,
  `total_requests` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `total_errors` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `api_version` VARCHAR(64) NULL,
  `config_json` JSON NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `search_provider_settings_provider_unique` (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `search_provider_settings` (
  `provider`,
  `enabled`,
  `status`
) VALUES (
  'serpapi',
  1,
  'unknown'
);
