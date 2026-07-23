-- Persist Google Intelligence / OSINT reports as JSON payloads

CREATE TABLE IF NOT EXISTS `intelligence_reports` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `module_key` VARCHAR(64) NOT NULL,
  `subject_name` VARCHAR(255) NOT NULL,
  `risk_score` INT UNSIGNED NOT NULL DEFAULT 0,
  `risk_level` VARCHAR(32) NOT NULL DEFAULT 'niedrig',
  `hit_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `report_json` JSON NOT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `intelligence_reports_user_module_unique` (`user_id`, `module_key`),
  KEY `intelligence_reports_user_id_idx` (`user_id`),
  CONSTRAINT `intelligence_reports_user_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
