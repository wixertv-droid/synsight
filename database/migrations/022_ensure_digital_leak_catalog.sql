-- Ensure Digital Leak & Exposure replaces phone/email in the live catalog.
-- Safe to re-run: upserts pricing, deactivates replaced modules, seeds DeHashed cost.

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

-- Replaced by digital_leak_exposure — hide from Analyse-/Ergebniscenter
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
