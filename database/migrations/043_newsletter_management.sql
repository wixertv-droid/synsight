-- SynSight Newsletter & Campaign Management
-- Separate consent-based subscriber list.
-- Registration alone NEVER means newsletter consent.

CREATE TABLE IF NOT EXISTS `newsletter_settings` (
  `id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `default_sender_account` VARCHAR(64) NOT NULL DEFAULT 'newsletter',
  `default_sender_name` VARCHAR(150) NOT NULL DEFAULT 'SynSight',
  `default_reply_to` VARCHAR(255) NULL,
  `default_timezone` VARCHAR(64) NOT NULL DEFAULT 'Europe/Berlin',
  `batch_size` INT UNSIGNED NOT NULL DEFAULT 25,
  `worker_interval_seconds` INT UNSIGNED NOT NULL DEFAULT 60,
  `unsubscribe_footer_text` TEXT NULL,
  `company_address` VARCHAR(500) NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `newsletter_settings_admin_fk`
    FOREIGN KEY (`updated_by_admin_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `newsletter_settings`
  (`id`, `enabled`, `default_timezone`, `batch_size`, `worker_interval_seconds`)
VALUES
  (1, 0, 'Europe/Berlin', 25, 60);


CREATE TABLE IF NOT EXISTS `newsletter_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(180) NOT NULL,
  `description` VARCHAR(500) NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'standard',
  `content_json` JSON NOT NULL,
  `rendered_html` LONGTEXT NOT NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by_admin_id` BIGINT UNSIGNED NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `newsletter_templates_active_idx` (`is_active`),
  KEY `newsletter_templates_category_idx` (`category`),
  CONSTRAINT `newsletter_templates_created_admin_fk`
    FOREIGN KEY (`created_by_admin_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL,
  CONSTRAINT `newsletter_templates_updated_admin_fk`
    FOREIGN KEY (`updated_by_admin_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NULL,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(180) NULL,

  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `source` VARCHAR(64) NOT NULL DEFAULT 'manual',

  `consent_at` TIMESTAMP(3) NULL,
  `consent_ip` VARCHAR(45) NULL,
  `consent_user_agent` VARCHAR(500) NULL,

  `unsubscribe_token` CHAR(64) NOT NULL,
  `unsubscribed_at` TIMESTAMP(3) NULL,

  `bounce_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_bounce_at` TIMESTAMP(3) NULL,

  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_email_unique` (`email`),
  UNIQUE KEY `newsletter_subscribers_unsubscribe_token_unique`
    (`unsubscribe_token`),

  KEY `newsletter_subscribers_user_idx` (`user_id`),
  KEY `newsletter_subscribers_status_idx` (`status`),
  KEY `newsletter_subscribers_created_idx` (`created_at`),

  CONSTRAINT `newsletter_subscribers_user_fk`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `newsletter_campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  `internal_name` VARCHAR(180) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `preheader` VARCHAR(255) NULL,

  `status` VARCHAR(32) NOT NULL DEFAULT 'draft',

  `template_id` BIGINT UNSIGNED NULL,

  `content_json` JSON NOT NULL,
  `rendered_html` LONGTEXT NOT NULL,

  `sender_account` VARCHAR(64) NOT NULL DEFAULT 'newsletter',
  `sender_name` VARCHAR(150) NULL,
  `reply_to` VARCHAR(255) NULL,

  `audience_type` VARCHAR(64) NOT NULL DEFAULT 'all_subscribers',
  `audience_json` JSON NULL,

  `scheduled_at` TIMESTAMP(3) NULL,
  `schedule_timezone` VARCHAR(64) NOT NULL DEFAULT 'Europe/Berlin',

  `recipient_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `sent_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `skipped_count` INT UNSIGNED NOT NULL DEFAULT 0,

  `created_by_admin_id` BIGINT UNSIGNED NULL,
  `updated_by_admin_id` BIGINT UNSIGNED NULL,

  `started_at` TIMESTAMP(3) NULL,
  `completed_at` TIMESTAMP(3) NULL,

  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  KEY `newsletter_campaigns_status_idx` (`status`),
  KEY `newsletter_campaigns_schedule_idx` (`scheduled_at`),
  KEY `newsletter_campaigns_created_idx` (`created_at`),
  KEY `newsletter_campaigns_template_idx` (`template_id`),

  CONSTRAINT `newsletter_campaigns_template_fk`
    FOREIGN KEY (`template_id`)
    REFERENCES `newsletter_templates` (`id`)
    ON DELETE SET NULL,

  CONSTRAINT `newsletter_campaigns_created_admin_fk`
    FOREIGN KEY (`created_by_admin_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL,

  CONSTRAINT `newsletter_campaigns_updated_admin_fk`
    FOREIGN KEY (`updated_by_admin_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `newsletter_deliveries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  `campaign_id` BIGINT UNSIGNED NOT NULL,
  `subscriber_id` BIGINT UNSIGNED NULL,

  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(180) NULL,

  `status` VARCHAR(32) NOT NULL DEFAULT 'queued',
  `attempt_count` INT UNSIGNED NOT NULL DEFAULT 0,

  `provider` VARCHAR(64) NULL,
  `message_id` VARCHAR(500) NULL,
  `error_message` TEXT NULL,

  `queued_at` TIMESTAMP(3) NULL,
  `sent_at` TIMESTAMP(3) NULL,

  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  UNIQUE KEY `newsletter_deliveries_campaign_email_unique`
    (`campaign_id`, `email`),

  KEY `newsletter_deliveries_campaign_idx` (`campaign_id`),
  KEY `newsletter_deliveries_subscriber_idx` (`subscriber_id`),
  KEY `newsletter_deliveries_status_idx` (`status`),

  CONSTRAINT `newsletter_deliveries_campaign_fk`
    FOREIGN KEY (`campaign_id`)
    REFERENCES `newsletter_campaigns` (`id`)
    ON DELETE CASCADE,

  CONSTRAINT `newsletter_deliveries_subscriber_fk`
    FOREIGN KEY (`subscriber_id`)
    REFERENCES `newsletter_subscribers` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- SYN_SIGHT_DEFAULT_NEWSLETTER_TEMPLATES
-- Feste System-IDs machen diesen Seed auch bei einem partiellen Wiederholungsversuch idempotent.

INSERT IGNORE INTO `newsletter_templates`
(
  `id`,
  `name`,
  `description`,
  `category`,
  `content_json`,
  `rendered_html`,
  `is_system`,
  `is_active`
)
VALUES

(
  1,
  'SynSight Standard',
  'Universelle SynSight-Vorlage für allgemeine Newsletter.',
  'standard',
  '{"version":1,"theme":"synsight","blocks":[{"id":"heading","type":"heading","text":"Neuigkeiten von SynSight"},{"id":"text","type":"text","text":"Hier beginnt dein Newsletter."},{"id":"button","type":"button","text":"Mehr erfahren","url":"https://synsight.de"}]}',
  '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px"><h1 style="margin:0 0 20px">Neuigkeiten von SynSight</h1><p style="line-height:1.7;color:#d4d4d8">Hier beginnt dein Newsletter.</p><p><a href="https://synsight.de" style="display:inline-block;padding:12px 18px;background:#c026d3;color:#fff;text-decoration:none;border-radius:8px">Mehr erfahren</a></p></div>',
  1,
  1
),

(
  2,
  'Produktupdate',
  'Für neue Funktionen, Analysen und SynSight-Produktupdates.',
  'product',
  '{"version":1,"theme":"synsight","blocks":[{"id":"heading","type":"heading","text":"Neu bei SynSight"},{"id":"text","type":"text","text":"Wir haben SynSight weiter verbessert."},{"id":"button","type":"button","text":"Update ansehen","url":"https://synsight.de/changelog"}]}',
  '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px"><p style="color:#e879f9;font-size:12px;text-transform:uppercase;letter-spacing:2px">Produktupdate</p><h1>Neu bei SynSight</h1><p style="line-height:1.7;color:#d4d4d8">Wir haben SynSight weiter verbessert.</p><p><a href="https://synsight.de/changelog" style="display:inline-block;padding:12px 18px;background:#c026d3;color:#fff;text-decoration:none;border-radius:8px">Update ansehen</a></p></div>',
  1,
  1
),

(
  3,
  'Sicherheitswarnung',
  'Auffällige Sicherheitsinformationen und wichtige Schutzmaßnahmen.',
  'security',
  '{"version":1,"theme":"security","blocks":[{"id":"heading","type":"heading","text":"Wichtiger Sicherheitshinweis"},{"id":"text","type":"text","text":"Wir möchten dich über ein wichtiges Sicherheitsthema informieren."},{"id":"button","type":"button","text":"Sicherheit prüfen","url":"https://synsight.de/security"}]}',
  '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border:1px solid #7f1d1d;border-radius:16px"><p style="color:#fca5a5;font-size:12px;text-transform:uppercase;letter-spacing:2px">Security Alert</p><h1>Wichtiger Sicherheitshinweis</h1><p style="line-height:1.7;color:#d4d4d8">Wir möchten dich über ein wichtiges Sicherheitsthema informieren.</p><p><a href="https://synsight.de/security" style="display:inline-block;padding:12px 18px;background:#991b1b;color:#fff;text-decoration:none;border-radius:8px">Sicherheit prüfen</a></p></div>',
  1,
  1
),

(
  4,
  'Aktion & Promotion',
  'Für zeitlich begrenzte Aktionen, Bonus-SynCredits und Angebote.',
  'promotion',
  '{"version":1,"theme":"promotion","blocks":[{"id":"heading","type":"heading","text":"Exklusive SynSight-Aktion"},{"id":"text","type":"text","text":"Für kurze Zeit wartet eine besondere Aktion auf dich."},{"id":"button","type":"button","text":"Aktion entdecken","url":"https://synsight.de"}]}',
  '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border:1px solid #86198f;border-radius:16px"><p style="color:#f0abfc;font-size:12px;text-transform:uppercase;letter-spacing:2px">SynSight Aktion</p><h1>Exklusive SynSight-Aktion</h1><p style="line-height:1.7;color:#d4d4d8">Für kurze Zeit wartet eine besondere Aktion auf dich.</p><p><a href="https://synsight.de" style="display:inline-block;padding:12px 18px;background:#c026d3;color:#fff;text-decoration:none;border-radius:8px">Aktion entdecken</a></p></div>',
  1,
  1
),

(
  5,
  'News & Wissen',
  'Für Blogartikel, Wissensseiten und redaktionelle Inhalte.',
  'content',
  '{"version":1,"theme":"content","blocks":[{"id":"heading","type":"heading","text":"Digitales Wissen von SynSight"},{"id":"text","type":"text","text":"Neue Einblicke rund um digitale Identität und Internetsicherheit."},{"id":"button","type":"button","text":"Artikel lesen","url":"https://synsight.de/wissen"}]}',
  '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#09090b;color:#f4f4f5;padding:32px;border-radius:16px"><p style="color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:2px">SynSight Wissen</p><h1>Digitales Wissen von SynSight</h1><p style="line-height:1.7;color:#d4d4d8">Neue Einblicke rund um digitale Identität und Internetsicherheit.</p><p><a href="https://synsight.de/wissen" style="display:inline-block;padding:12px 18px;background:#c026d3;color:#fff;text-decoration:none;border-radius:8px">Artikel lesen</a></p></div>',
  1,
  1
);
