-- Support role for staff presence + configurable support hours (Ampel)
SET NAMES utf8mb4;

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'support', 'user') NOT NULL DEFAULT 'user';

UPDATE `platform_settings`
SET `settings_json` = JSON_SET(
  COALESCE(`settings_json`, JSON_OBJECT()),
  '$.supportHoursStart', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportHoursStart')), '09:00'),
  '$.supportHoursEnd', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportHoursEnd')), '18:00'),
  '$.supportTimezone', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportTimezone')), 'Europe/Berlin'),
  '$.supportResponseText', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`settings_json`, '$.supportResponseText')), 'In der Regel innerhalb von 1–2 Werktagen')
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
