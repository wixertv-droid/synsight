-- Reverse Image Search — admin InsightFace / module settings
CREATE TABLE IF NOT EXISTS reverse_image_module_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  api_enabled TINYINT(1) NOT NULL DEFAULT 1,
  compare_url VARCHAR(500) NOT NULL DEFAULT 'http://161.97.85.22:8000/compare',
  similarity_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.600,
  compare_timeout_ms INT UNSIGNED NOT NULL DEFAULT 12000,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO reverse_image_module_settings (id) VALUES (1);
