-- Order workflow: pricing, Vollmacht, submit fields, desk
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `order_pricing` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_type` VARCHAR(64) NOT NULL,
  `label` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) NULL,
  `credits` INT UNSIGNED NOT NULL DEFAULT 0,
  `requires_vollmacht` TINYINT(1) NOT NULL DEFAULT 1,
  `synsight_capable` TINYINT(1) NOT NULL DEFAULT 1,
  `capability_hint` VARCHAR(500) NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_pricing_type_unique` (`order_type`),
  KEY `order_pricing_active_idx` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `order_pricing`
  (`order_type`, `label`, `description`, `credits`, `requires_vollmacht`, `synsight_capable`, `capability_hint`, `sort_order`, `is_active`)
VALUES
  ('profile_delete', 'Profil-Löschung', 'Löschung öffentlicher Profile bei Plattformen.', 25, 1, 1, 'SynSight kann Löschanfragen bei unterstützten Plattformen einreichen.', 10, 1),
  ('google_removal', 'Google-Entfernung', 'Entfernung von Suchtreffern / Snippets bei Google.', 15, 1, 1, 'Entfernung über Google-Prozesse möglich, sofern Rechtsgrundlage vorliegt.', 20, 1),
  ('forum_contact', 'Foren-Kontakt', 'Kontaktaufnahme mit Foren-/Community-Betreibern.', 10, 0, 1, 'Kontaktaufnahme möglich; Löschung hängt vom Betreiber ab.', 30, 1),
  ('gdpr', 'DSGVO-Auskunft / Löschung', 'Formelle Datenschutzanfrage (Auskunft, Löschung, Berichtigung).', 40, 1, 1, 'SynSight erstellt und übermittelt DSGVO-Anfragen im Auftrag.', 40, 1),
  ('cache_removal', 'Cache- / Index-Entfernung', 'Entfernung aus Caches und Suchindexen.', 12, 0, 1, 'Cache-/Index-Anfragen sind in der Regel möglich.', 50, 1),
  ('privacy_request', 'Privacy-Request', 'Allgemeine Datenschutz- / Privacy-Anfrage.', 30, 1, 1, 'Privacy-Requests können gestellt werden, Erfolg abhängig vom Empfänger.', 60, 1)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`);

CREATE TABLE IF NOT EXISTS `order_vollmachten` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('generated','uploaded','verified') NOT NULL DEFAULT 'generated',
  `template_html` MEDIUMTEXT NOT NULL,
  `template_path` VARCHAR(500) NULL,
  `signed_path` VARCHAR(500) NULL,
  `signed_mime` VARCHAR(120) NULL,
  `signed_file_name` VARCHAR(255) NULL,
  `generated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `uploaded_at` TIMESTAMP(3) NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_vollmachten_order_unique` (`order_id`),
  KEY `order_vollmachten_user_idx` (`user_id`),
  KEY `order_vollmachten_status_idx` (`status`),
  CONSTRAINT `order_vollmachten_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_vollmachten_order_fk` FOREIGN KEY (`order_id`) REFERENCES `synsight_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend synsight_orders for review/submit workflow
SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'synsight_orders' AND COLUMN_NAME = 'credits_charged'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE `synsight_orders`
    ADD COLUMN `credits_charged` INT UNSIGNED NULL AFTER `note`,
    ADD COLUMN `requires_vollmacht` TINYINT(1) NOT NULL DEFAULT 0 AFTER `credits_charged`,
    ADD COLUMN `vollmacht_id` BIGINT UNSIGNED NULL AFTER `requires_vollmacht`,
    ADD COLUMN `capability_ok` TINYINT(1) NULL AFTER `vollmacht_id`,
    ADD COLUMN `capability_reason` VARCHAR(500) NULL AFTER `capability_ok`,
    ADD COLUMN `reviewed_at` TIMESTAMP(3) NULL AFTER `capability_reason`,
    ADD COLUMN `submitted_at` TIMESTAMP(3) NULL AFTER `reviewed_at`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Allow order as credit transaction source
ALTER TABLE `credit_transactions`
  MODIFY COLUMN `transaction_source` ENUM(
    'purchase','analysis','bonus','refund','admin_credit','admin_remove','adjustment','promotion','order'
  ) NOT NULL DEFAULT 'adjustment';
