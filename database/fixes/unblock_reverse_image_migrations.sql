-- Unblock reverse-image migrations after failed/partial applies or checksum fixes.
-- Safe to re-run: migrations 034–037 are idempotent (IF NOT EXISTS / guarded ALTER).
DELETE FROM `_synsight_schema_migrations`
WHERE `name` IN (
  '034_reverse_image_search.sql',
  '035_reverse_image_module_settings.sql',
  '036_reverse_image_two_phase.sql',
  '037_admin_platform_repair.sql'
);
