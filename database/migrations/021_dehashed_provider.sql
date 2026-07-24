-- Switch Digital Leak & Exposure provider from HIBP to DeHashed.com
-- Safe if 020 already applied with haveibeenpwned, or fresh with dehashed.

SET NAMES utf8mb4;

INSERT INTO `api_cost_settings`
  (`provider_code`, `label`, `cost_per_request_eur`, `notes`)
VALUES
  ('dehashed', 'DeHashed.com', 0.000000, 'DeHashed Search API — optional cost override')
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `notes` = VALUES(`notes`);

-- Rename credential row if an admin already saved under haveibeenpwned
UPDATE `api_credentials`
SET
  `provider` = 'dehashed',
  `label` = CASE
    WHEN `label` IN ('haveibeenpwned', 'Have I Been Pwned', 'have i been pwned')
      THEN 'DeHashed.com'
    ELSE `label`
  END
WHERE `provider` = 'haveibeenpwned'
  AND NOT EXISTS (
    SELECT 1 FROM (
      SELECT `id` FROM `api_credentials` WHERE `provider` = 'dehashed' LIMIT 1
    ) AS existing_dehashed
  );

-- Drop obsolete HIBP cost row (keep history in api_usage_events/logs)
DELETE FROM `api_cost_settings` WHERE `provider_code` = 'haveibeenpwned';
