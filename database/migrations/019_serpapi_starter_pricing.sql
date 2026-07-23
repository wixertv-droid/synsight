-- SerpAPI Starter: $25 / 1000 searches = $0.025 ≈ €0.023 (@0.92)
-- Only successful searches are billable (enforced in app code).
-- Also re-applies Gemini 3.6 Flash token defaults if still on old 2.5 Flash values.

SET NAMES utf8mb4;

UPDATE `api_cost_settings`
SET
  `billing_mode` = 'per_request',
  `cost_per_request_eur` = 0.023000,
  `notes` = 'SerpAPI Starter: $25/1000 = $0.025 ≈ €0.023 — nur erfolgreiche Suchen'
WHERE `provider_code` = 'serpapi';

UPDATE `api_cost_settings`
SET
  `billing_mode` = 'per_token',
  `cost_per_1m_input_tokens_eur` = 1.380000,
  `cost_per_1m_output_tokens_eur` = 6.900000,
  `notes` = 'gemini-3.6-flash Standard: $1.50 Input / $7.50 Output pro 1M Tokens → EUR @0.92'
WHERE `provider_code` = 'gemini'
  AND (
    `cost_per_1m_input_tokens_eur` < 1.0
    OR `cost_per_1m_output_tokens_eur` < 3.0
  );
