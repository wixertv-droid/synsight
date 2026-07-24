-- =============================================================================
-- SynSight: Suchhistorie zurücksetzen (nächste Analyse = frischer Start / „Suche 1“)
-- Ausführen auf dem Produktionsserver (MariaDB), z. B.:
--   mysql -u … -p synsight < database/scripts/reset_search_history.sql
-- =============================================================================

-- 1) Google Intelligence Reports (Ergebnis-Center / gespeicherte Analysen)
DELETE FROM `intelligence_reports`;

-- 2) Legacy-Analyseberichte (falls vorhanden)
DELETE FROM `analysis_report_items`;
DELETE FROM `analysis_reports`;

-- 3) SerpAPI-/Gemini-Usage-Events der Analyse (Admin-Finanzen Historie für Suchen)
DELETE FROM `api_usage_events`
WHERE `event_type` IN (
  'google_analysis',
  'search',
  'search_error',
  'summarize',
  'summarize_partial',
  'summarize_safety_fallback',
  'summarize_error'
)
OR `provider_code` IN ('serpapi', 'gemini');

-- 4) Optionale Credit-/Usage-Logs nur für Google-Analyse
DELETE FROM `usage_logs`
WHERE `analysis_key` = 'google_search';

-- Hinweis: Nach dem SQL-Lauf App neu starten (pm2 restart), damit
-- In-Memory-Caches (session-store, search-cache) ebenfalls leer sind.
