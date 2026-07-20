-- Support role, tickets, and configurable support hours

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'support', 'user') NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_number` VARCHAR(24) NOT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('new', 'open', 'waiting', 'resolved', 'closed') NOT NULL DEFAULT 'new',
  `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
  `assigned_to` BIGINT UNSIGNED NULL,
  `source` ENUM('public', 'dashboard') NOT NULL DEFAULT 'public',
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `support_tickets_number_unique` (`ticket_number`),
  KEY `support_tickets_user_id_idx` (`user_id`),
  KEY `support_tickets_status_idx` (`status`),
  KEY `support_tickets_email_idx` (`email`),
  CONSTRAINT `support_tickets_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_assigned_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE `platform_settings`
SET `settings_json` = JSON_SET(
  COALESCE(`settings_json`, JSON_OBJECT()),
  '$.supportHoursStart', '09:00',
  '$.supportHoursEnd', '18:00',
  '$.supportTimezone', 'Europe/Berlin',
  '$.supportResponseText', 'In der Regel innerhalb von 1–2 Werktagen'
)
WHERE `id` = 1;

INSERT IGNORE INTO `platform_settings` (`id`, `settings_json`)
VALUES (
  1,
  JSON_OBJECT(
    'imageMaxUploadMb', 12,
    'imageCompressionQuality', 82,
    'imageWebpQuality', 80,
    'imageThumbnailQuality', 72,
    'imageMaxResolution', 2048,
    'encryptOriginals', true,
    'generateAnalysisImages', true,
    'supportHoursStart', '09:00',
    'supportHoursEnd', '18:00',
    'supportTimezone', 'Europe/Berlin',
    'supportResponseText', 'In der Regel innerhalb von 1–2 Werktagen'
  )
);
