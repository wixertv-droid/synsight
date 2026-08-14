-- SynSight Advertising & Campaign Center
-- Google Ads, Meta, Instagram, TikTok, LinkedIn, X and manual campaigns.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `advertising_campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(180) NOT NULL,
  `platform` VARCHAR(64) NOT NULL DEFAULT 'other',
  `external_campaign_id` VARCHAR(255) NULL,
  `external_account_id` VARCHAR(255) NULL,

  `status` ENUM('draft','active','paused','completed','archived')
    NOT NULL DEFAULT 'draft',

  `objective` VARCHAR(120) NULL,
  `landing_url` VARCHAR(500) NULL,

  `starts_at` DATE NULL,
  `ends_at` DATE NULL,

  `daily_budget_eur` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_budget_eur` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  `target_country` VARCHAR(64) NULL,
  `target_region` VARCHAR(120) NULL,
  `target_audience` TEXT NULL,

  `utm_source` VARCHAR(120) NULL,
  `utm_medium` VARCHAR(120) NULL,
  `utm_campaign` VARCHAR(180) NULL,
  `utm_content` VARCHAR(180) NULL,

  `notes` TEXT NULL,

  `created_by_admin_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  KEY `advertising_campaigns_platform_idx` (`platform`),
  KEY `advertising_campaigns_status_idx` (`status`),
  KEY `advertising_campaigns_dates_idx` (`starts_at`, `ends_at`),

  CONSTRAINT `advertising_campaigns_admin_fk`
    FOREIGN KEY (`created_by_admin_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `advertising_daily_metrics` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_id` BIGINT UNSIGNED NOT NULL,
  `metric_date` DATE NOT NULL,

  `spend_eur` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,

  `impressions` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `reach` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `clicks` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `conversions` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `conversion_value_eur` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,

  `source` VARCHAR(32) NOT NULL DEFAULT 'manual',
  `external_sync_id` VARCHAR(255) NULL,
  `meta_json` JSON NULL,

  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  UNIQUE KEY `advertising_metric_campaign_date_uq`
    (`campaign_id`, `metric_date`),

  KEY `advertising_metric_date_idx` (`metric_date`),
  KEY `advertising_metric_campaign_idx` (`campaign_id`),

  CONSTRAINT `advertising_metrics_campaign_fk`
    FOREIGN KEY (`campaign_id`)
    REFERENCES `advertising_campaigns` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
