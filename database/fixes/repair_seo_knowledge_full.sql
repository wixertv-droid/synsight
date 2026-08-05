-- Fix incomplete SEO CMS tables (pages + children). Safe to re-run.

ALTER TABLE seo_knowledge_pages
  ADD COLUMN IF NOT EXISTS `canonical_url` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `og_title` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `og_description` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `og_image_url` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `twitter_card` VARCHAR(32) NOT NULL DEFAULT 'summary_large_image',
  ADD COLUMN IF NOT EXISTS `robots_index` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `robots_follow` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `hero_image_url` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `author_id` BIGINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS `deleted_at` TIMESTAMP(3) NULL,
  ADD COLUMN IF NOT EXISTS `automation_flags_json` JSON NULL;

CREATE TABLE IF NOT EXISTS `seo_knowledge_sections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` BIGINT UNSIGNED NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `section_type` ENUM('content','infobox','hint','code','table','list') NOT NULL DEFAULT 'content',
  `heading` VARCHAR(255) NULL,
  `body` LONGTEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `meta_json` JSON NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seo_knowledge_sections_page_sort_idx` (`page_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE seo_knowledge_sections
  ADD COLUMN IF NOT EXISTS `section_type` ENUM('content','infobox','hint','code','table','list') NOT NULL DEFAULT 'content',
  ADD COLUMN IF NOT EXISTS `heading` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `body` LONGTEXT NULL,
  ADD COLUMN IF NOT EXISTS `image_url` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `meta_json` JSON NULL,
  ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS `seo_knowledge_faqs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` BIGINT UNSIGNED NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `question` VARCHAR(500) NOT NULL,
  `answer` TEXT NOT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seo_knowledge_faqs_page_sort_idx` (`page_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE seo_knowledge_faqs
  ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS `seo_knowledge_links` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_id` BIGINT UNSIGNED NOT NULL,
  `link_type` ENUM('wissen','analyse','landing','module') NOT NULL DEFAULT 'wissen',
  `target` VARCHAR(500) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `seo_knowledge_links_page_sort_idx` (`page_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE seo_knowledge_links
  ADD COLUMN IF NOT EXISTS `link_type` ENUM('wissen','analyse','landing','module') NOT NULL DEFAULT 'wissen',
  ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Ensure demo content has children
SET @pid := (SELECT id FROM seo_knowledge_pages WHERE slug='demo-digitaler-fussabdruck' LIMIT 1);

DELETE FROM seo_knowledge_sections WHERE page_id=@pid;
DELETE FROM seo_knowledge_faqs WHERE page_id=@pid;
DELETE FROM seo_knowledge_links WHERE page_id=@pid;

INSERT INTO seo_knowledge_sections (page_id, sort_order, section_type, heading, body) VALUES
(@pid, 0, 'content', 'Was ist ein digitaler Fußabdruck?', 'Öffentliche Spuren im Internet: Social-Media-Profile, Foren, Leaks, Bilder und Domain-Einträge.'),
(@pid, 1, 'infobox', 'Kurz gesagt', 'SynSight wertet nur öffentlich zugängliche Quellen aus — keine privaten Postfächer.'),
(@pid, 2, 'hint', 'Nächster Schritt', 'Starten Sie den Risiko-Check auf der Startseite oder legen Sie ein Konto an.');

INSERT INTO seo_knowledge_faqs (page_id, sort_order, question, answer) VALUES
(@pid, 0, 'Ist das nur eine Demo?', 'Ja. Die Seite dient als Vorlage für echte Inhalte im Admin-CMS.'),
(@pid, 1, 'Kann ich sie bearbeiten?', 'Ja — unter Admin → SEO & Wissensdatenbank → Seitenübersicht.');

INSERT INTO seo_knowledge_links (page_id, sort_order, link_type, target, label) VALUES
(@pid, 0, 'analyse', '/analysen', 'Alle Analysen'),
(@pid, 1, 'landing', '/#demo-scanner', 'Risiko-Check');

SELECT 'pages' AS t, COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='seo_knowledge_pages'
UNION ALL SELECT 'sections_cols', COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='seo_knowledge_sections'
UNION ALL SELECT 'demo_sections', COUNT(*) FROM seo_knowledge_sections WHERE page_id=@pid;
