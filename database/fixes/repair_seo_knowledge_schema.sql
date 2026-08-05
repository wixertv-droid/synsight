-- Repair incomplete seo_knowledge_* schema (VPS hotfix).
-- Safe/idempotent: adds missing columns only. Keeps existing rows.

SET NAMES utf8mb4;
SET @db := DATABASE();

-- Ensure base tables exist (no-op if already present)
CREATE TABLE IF NOT EXISTS `seo_knowledge_pages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(180) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `language` VARCHAR(8) NOT NULL DEFAULT 'de',
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  `category` VARCHAR(64) NOT NULL DEFAULT 'OSINT',
  `target_module` VARCHAR(64) NOT NULL DEFAULT 'dashboard',
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Helper macro pattern: add column if missing
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='seo_priority');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `seo_priority` ENUM(''hoch'',''mittel'',''niedrig'') NOT NULL DEFAULT ''mittel'' AFTER `target_module`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='search_intent');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `search_intent` ENUM(''informational'',''commercial'',''transactional'',''navigational'') NOT NULL DEFAULT ''informational'' AFTER `seo_priority`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='difficulty');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `difficulty` ENUM(''einsteiger'',''fortgeschritten'',''experte'') NOT NULL DEFAULT ''einsteiger'' AFTER `search_intent`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='risk_level');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `risk_level` ENUM(''niedrig'',''mittel'',''hoch'',''kritisch'') NOT NULL DEFAULT ''mittel'' AFTER `difficulty`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='search_volume');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `search_volume` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `risk_level`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='keyword_difficulty');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `keyword_difficulty` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `search_volume`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='seo_title');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `seo_title` VARCHAR(255) NULL AFTER `keyword_difficulty`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='meta_description');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `meta_description` VARCHAR(500) NULL AFTER `seo_title`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='meta_keywords');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `meta_keywords` TEXT NULL AFTER `meta_description`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='canonical_url');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `canonical_url` VARCHAR(500) NULL AFTER `meta_keywords`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='og_title');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `og_title` VARCHAR(255) NULL AFTER `canonical_url`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='og_description');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `og_description` VARCHAR(500) NULL AFTER `og_title`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='og_image_url');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `og_image_url` VARCHAR(500) NULL AFTER `og_description`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='twitter_card');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `twitter_card` VARCHAR(32) NOT NULL DEFAULT ''summary_large_image'' AFTER `og_image_url`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='robots_index');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `robots_index` TINYINT(1) NOT NULL DEFAULT 1 AFTER `twitter_card`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='robots_follow');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `robots_follow` TINYINT(1) NOT NULL DEFAULT 1 AFTER `robots_index`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='hero_title');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `hero_title` VARCHAR(255) NULL AFTER `robots_follow`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='hero_subtitle');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `hero_subtitle` VARCHAR(500) NULL AFTER `hero_title`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='hero_image_url');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `hero_image_url` VARCHAR(500) NULL AFTER `hero_subtitle`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='intro');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `intro` LONGTEXT NULL AFTER `hero_image_url`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='cta_preset');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `cta_preset` ENUM(''analyse_starten'',''kostenlos_testen'',''jetzt_pruefen'',''custom'') NOT NULL DEFAULT ''jetzt_pruefen'' AFTER `intro`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='cta_label');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `cta_label` VARCHAR(120) NOT NULL DEFAULT ''Jetzt prüfen'' AFTER `cta_preset`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='cta_href');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `cta_href` VARCHAR(500) NOT NULL DEFAULT ''/#demo-scanner'' AFTER `cta_label`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='author_id');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `author_id` BIGINT UNSIGNED NULL AFTER `cta_href`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='author_name');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `author_name` VARCHAR(150) NULL AFTER `author_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='published_at');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `published_at` TIMESTAMP(3) NULL AFTER `author_name`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='deleted_at');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `deleted_at` TIMESTAMP(3) NULL AFTER `published_at`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='seo_knowledge_pages' AND COLUMN_NAME='automation_flags_json');
SET @sql := IF(@exists=0, 'ALTER TABLE `seo_knowledge_pages` ADD COLUMN `automation_flags_json` JSON NULL AFTER `deleted_at`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Child tables
CREATE TABLE IF NOT EXISTS `seo_knowledge_sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` BIGINT UNSIGNED NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `section_type` ENUM('content', 'infobox', 'hint', 'code', 'table', 'list') NOT NULL DEFAULT 'content',
  `heading` VARCHAR(255) NULL,
  `body` LONGTEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `meta_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seo_knowledge_sections_page_sort_idx` (`page_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `seo_knowledge_faqs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` BIGINT UNSIGNED NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `question` VARCHAR(500) NOT NULL,
  `answer` TEXT NOT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seo_knowledge_faqs_page_sort_idx` (`page_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `seo_knowledge_links` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` BIGINT UNSIGNED NOT NULL,
  `link_type` ENUM('wissen', 'analyse', 'landing', 'module') NOT NULL DEFAULT 'wissen',
  `target` VARCHAR(500) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seo_knowledge_links_page_sort_idx` (`page_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mark migrations after running this repair (from shell), e.g.:
-- UPDATE/INSERT checksum for 039 via mysql -e (see deploy notes).
SELECT 'seo_knowledge schema repair done' AS status;
