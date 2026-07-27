-- Reverse Image Search: two-phase flow (discovery → compare) + DB cache
ALTER TABLE reverse_image_scans
  ADD COLUMN serp_cache_json JSON NULL AFTER expires_at;

INSERT INTO analysis_pricing (
  analysis_key, label, description, credits, is_active, sort_order,
  is_system_default, default_label, default_description, default_credits
)
SELECT
  'reverse_image_discovery',
  'Reverse Image · Bildsuche',
  'SerpAPI Google Images — Namen, Alias und Benutzernamen durchsuchen.',
  12,
  1,
  118,
  1,
  'Reverse Image · Bildsuche',
  'SerpAPI Google Images — Namen, Alias und Benutzernamen durchsuchen.',
  12
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM analysis_pricing WHERE analysis_key = 'reverse_image_discovery'
);

INSERT INTO analysis_pricing (
  analysis_key, label, description, credits, is_active, sort_order,
  is_system_default, default_label, default_description, default_credits
)
SELECT
  'reverse_image_compare',
  'Reverse Image · Gesichtsvergleich',
  'InsightFace-Abgleich ausgewählter Bildlinks gegen Referenzfotos.',
  13,
  1,
  119,
  1,
  'Reverse Image · Gesichtsvergleich',
  'InsightFace-Abgleich ausgewählter Bildlinks gegen Referenzfotos.',
  13
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM analysis_pricing WHERE analysis_key = 'reverse_image_compare'
);

UPDATE analysis_pricing
SET
  label = 'Reverse Image Search (Legacy)',
  description = 'Veraltet — nutzen Sie Bildsuche + Gesichtsvergleich.',
  is_active = 0
WHERE analysis_key = 'reverse_image_search';
