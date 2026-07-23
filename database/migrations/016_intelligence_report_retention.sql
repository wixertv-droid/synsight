-- Report retention: expires_at + retention_days on intelligence_reports

ALTER TABLE `intelligence_reports`
  ADD COLUMN `retention_days` INT UNSIGNED NOT NULL DEFAULT 30 AFTER `hit_count`,
  ADD COLUMN `expires_at` TIMESTAMP(3) NULL AFTER `retention_days`;

CREATE INDEX `intelligence_reports_expires_at_idx`
  ON `intelligence_reports` (`expires_at`);
