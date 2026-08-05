-- SEO & Wissensdatenbank CMS (Admin-managed public knowledge pages).
-- Additive only — does not alter existing tables.

SET NAMES utf8mb4;
SET @db := DATABASE();

CREATE TABLE IF NOT EXISTS `seo_knowledge_pages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(180) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `language` VARCHAR(8) NOT NULL DEFAULT 'de',
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  `category` VARCHAR(64) NOT NULL DEFAULT 'OSINT',
  `target_module` VARCHAR(64) NOT NULL DEFAULT 'dashboard',
  `seo_priority` ENUM('hoch', 'mittel', 'niedrig') NOT NULL DEFAULT 'mittel',
  `search_intent` ENUM('informational', 'commercial', 'transactional', 'navigational')
    NOT NULL DEFAULT 'informational',
  `difficulty` ENUM('einsteiger', 'fortgeschritten', 'experte') NOT NULL DEFAULT 'einsteiger',
  `risk_level` ENUM('niedrig', 'mittel', 'hoch', 'kritisch') NOT NULL DEFAULT 'mittel',
  `search_volume` INT UNSIGNED NOT NULL DEFAULT 0,
  `keyword_difficulty` INT UNSIGNED NOT NULL DEFAULT 0,
  `seo_title` VARCHAR(255) NULL,
  `meta_description` VARCHAR(500) NULL,
  `meta_keywords` TEXT NULL,
  `canonical_url` VARCHAR(500) NULL,
  `og_title` VARCHAR(255) NULL,
  `og_description` VARCHAR(500) NULL,
  `og_image_url` VARCHAR(500) NULL,
  `twitter_card` VARCHAR(32) NOT NULL DEFAULT 'summary_large_image',
  `robots_index` TINYINT(1) NOT NULL DEFAULT 1,
  `robots_follow` TINYINT(1) NOT NULL DEFAULT 1,
  `hero_title` VARCHAR(255) NULL,
  `hero_subtitle` VARCHAR(500) NULL,
  `hero_image_url` VARCHAR(500) NULL,
  `intro` LONGTEXT NULL,
  `cta_preset` ENUM('analyse_starten', 'kostenlos_testen', 'jetzt_pruefen', 'custom')
    NOT NULL DEFAULT 'jetzt_pruefen',
  `cta_label` VARCHAR(120) NOT NULL DEFAULT 'Jetzt prüfen',
  `cta_href` VARCHAR(500) NOT NULL DEFAULT '/#demo-scanner',
  `author_id` BIGINT UNSIGNED NULL,
  `author_name` VARCHAR(150) NULL,
  `published_at` TIMESTAMP(3) NULL,
  `deleted_at` TIMESTAMP(3) NULL,
  `automation_flags_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `seo_knowledge_pages_slug_lang_uq` (`slug`, `language`),
  KEY `seo_knowledge_pages_status_idx` (`status`, `deleted_at`),
  KEY `seo_knowledge_pages_category_idx` (`category`),
  KEY `seo_knowledge_pages_module_idx` (`target_module`),
  KEY `seo_knowledge_pages_priority_idx` (`seo_priority`),
  KEY `seo_knowledge_pages_updated_idx` (`updated_at`),
  KEY `seo_knowledge_pages_volume_idx` (`search_volume`),
  KEY `seo_knowledge_pages_deleted_idx` (`deleted_at`),
  CONSTRAINT `seo_knowledge_pages_author_fk`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `seo_knowledge_sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` BIGINT UNSIGNED NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `section_type` ENUM('content', 'infobox', 'hint', 'code', 'table', 'list')
    NOT NULL DEFAULT 'content',
  `heading` VARCHAR(255) NULL,
  `body` LONGTEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `meta_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seo_knowledge_sections_page_sort_idx` (`page_id`, `sort_order`),
  CONSTRAINT `seo_knowledge_sections_page_fk`
    FOREIGN KEY (`page_id`) REFERENCES `seo_knowledge_pages` (`id`) ON DELETE CASCADE
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
  KEY `seo_knowledge_faqs_page_sort_idx` (`page_id`, `sort_order`),
  CONSTRAINT `seo_knowledge_faqs_page_fk`
    FOREIGN KEY (`page_id`) REFERENCES `seo_knowledge_pages` (`id`) ON DELETE CASCADE
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
  KEY `seo_knowledge_links_page_sort_idx` (`page_id`, `sort_order`),
  CONSTRAINT `seo_knowledge_links_page_fk`
    FOREIGN KEY (`page_id`) REFERENCES `seo_knowledge_pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
