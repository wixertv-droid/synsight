-- Manual repair if Analyse Center still shows phone/email instead of Digital Leak.
-- Run on the VPS:
--   mysql -u synsight -p synsight < database/fixes/repair_digital_leak_catalog.sql
-- Or:
--   DATABASE_URL='mysql://synsight:...@localhost:3306/synsight' \
--     npx tsx -e "import('./src/lib/credits/ensure-digital-leak-catalog.ts').then(m => m.ensureDigitalLeakCatalog(true).then(console.log))"

INSERT INTO `analysis_pricing`
  (`analysis_key`, `label`, `description`, `credits`, `sort_order`,
   `is_active`, `is_system_default`, `default_label`,
   `default_description`, `default_credits`)
VALUES
  (
    'digital_leak_exposure',
    'Digital Leak & Exposure Scan',
    'Öffentlich bekannte Datenlecks und kompromittierte Identifikatoren (E-Mail & Telefon).',
    8,
    25,
    1,
    1,
    'Digital Leak & Exposure Scan',
    'Öffentlich bekannte Datenlecks und kompromittierte Identifikatoren (E-Mail & Telefon).',
    8
  )
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `credits` = VALUES(`credits`),
  `sort_order` = VALUES(`sort_order`),
  `default_label` = VALUES(`default_label`),
  `default_description` = VALUES(`default_description`),
  `default_credits` = VALUES(`default_credits`),
  `is_system_default` = 1,
  `is_active` = 1;

UPDATE `analysis_pricing`
SET `is_active` = 0
WHERE `analysis_key` IN ('phone_analysis', 'email_analysis');

INSERT INTO `api_cost_settings`
  (`provider_code`, `label`, `cost_per_request_eur`, `notes`, `is_active`)
VALUES
  (
    'dehashed',
    'DeHashed.com',
    0.000000,
    'DeHashed Search API — optional cost override',
    1
  )
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `notes` = VALUES(`notes`),
  `is_active` = 1;

SELECT analysis_key, credits, is_active
FROM analysis_pricing
WHERE analysis_key IN ('digital_leak_exposure', 'phone_analysis', 'email_analysis')
ORDER BY analysis_key;
