-- SynSight development seed: admin user
-- Password: admin (NEVER store plaintext — Argon2id hash only)
-- Run after 001_initial_schema.sql

SET NAMES utf8mb4;

INSERT INTO `users` (`email`, `username`, `password_hash`, `status`, `email_verified_at`)
VALUES (
  'admin@synsight.de',
  'admin',
  '$argon2id$v=19$m=65536,t=3,p=4$PrFVeH70yPNJ59suHjfHcA$GgSHI1UGZf57RVnVL/ujfq2YeL//MEqceOEdpkP5QEs',
  'active',
  CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
  `password_hash` = VALUES(`password_hash`),
  `status` = VALUES(`status`);

SET @admin_user_id = (SELECT `id` FROM `users` WHERE `username` = 'admin' LIMIT 1);

INSERT INTO `profiles` (`user_id`, `first_name`, `last_name`, `region`, `locale`, `onboarding_step`, `onboarding_completed_at`)
VALUES (
  @admin_user_id,
  'Alex',
  'Morgan',
  'EU',
  'de-DE',
  4,
  CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
  `first_name` = VALUES(`first_name`),
  `last_name` = VALUES(`last_name`),
  `onboarding_step` = VALUES(`onboarding_step`);

INSERT INTO `security_profiles` (
  `user_id`,
  `monitoring_enabled`,
  `critical_alerts`,
  `weekly_summary`,
  `ai_recommendations`,
  `security_score`,
  `last_analysis_at`,
  `next_scan_at`,
  `consent_monitoring_at`
)
VALUES (
  @admin_user_id,
  1,
  1,
  1,
  1,
  78,
  CURRENT_TIMESTAMP(3),
  DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY),
  CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE
  `security_score` = VALUES(`security_score`),
  `last_analysis_at` = VALUES(`last_analysis_at`);

INSERT INTO `user_settings` (`user_id`, `theme`, `locale`, `timezone`)
VALUES (@admin_user_id, 'dark', 'de-DE', 'Europe/Berlin')
ON DUPLICATE KEY UPDATE
  `theme` = VALUES(`theme`);

INSERT INTO `subscription_plans` (`code`, `name`, `description`, `price_monthly`, `price_yearly`, `currency`, `features_json`, `is_active`)
VALUES (
  'protect',
  'SynSight Protect',
  'Vollständige Identitätsüberwachung mit KI-Analyse und Prioritäts-Alerts.',
  29.00,
  290.00,
  'EUR',
  JSON_ARRAY('24/7 Monitoring', 'KI-Analyse', 'Leak-Alerts', 'Wöchentlicher Report'),
  1
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`);

SET @plan_id = (SELECT `id` FROM `subscription_plans` WHERE `code` = 'protect' LIMIT 1);

INSERT INTO `subscriptions` (
  `user_id`,
  `plan_id`,
  `status`,
  `current_period_start`,
  `current_period_end`,
  `cancel_at_period_end`
)
VALUES (
  @admin_user_id,
  @plan_id,
  'active',
  CURRENT_TIMESTAMP(3),
  DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 1 MONTH),
  0
)
ON DUPLICATE KEY UPDATE
  `status` = VALUES(`status`);
