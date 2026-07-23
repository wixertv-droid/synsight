# Sprint 6A — Adminbereich auf SerpAPI umstellen · Abschlussbericht

**Branch:** `cursor/serpapi-search-provider-7c12`  
**Basis:** `main` (Arbeitsstand von `cursor/sprint-6a-google-osint-7c12`)  
**Datum:** 23. Juli 2026  
**Status:** Implementiert · Typecheck / ESLint / Tests (171) / Build grün · PR #37

---

## Ziel

Vollständige Entfernung der Google Custom Search JSON API und Ersatz durch SerpAPI
als Suchanbieter — ohne Funktionsverlust, ohne Design-Regressionen, ohne erfundene SERP-Daten.

---

## Geänderte / neue Dateien (Kern)

### Datenbank

- `database/migrations/015_search_provider_settings.sql` — neu
- `src/lib/database/schema.ts` — Tabelle `searchProviderSettings`

### Search Provider Layer

- `src/lib/search/types.ts` — `SearchProvider` Interface
- `src/lib/search/providers/serpapi-provider.ts` — `SerpApiProvider`
- `src/lib/search/index.ts` — Factory / Provider-Optionen
- `src/lib/services/search-provider-service.ts` — Speichern, Test, Metriken, Runtime-Suche
- `src/lib/validation/search-provider.ts` — Zod-Schemas

### API-Routen

- `src/app/api/admin/search-provider/route.ts` — `GET` / `PUT`
- `src/app/api/admin/search-provider/test/route.ts` — `POST`
- `src/app/api/admin/search-provider/status/route.ts` — `GET`

### Admin UI

- `src/components/admin/views/AdminSearchProviderPanel.tsx` — Suchanbieter-Panel
- `src/components/admin/views/AdminApiCredentialsView.tsx` — CSE entfernt, Panel eingebunden
- `src/components/admin/views/AdminDashboardView.tsx` — API-Status SerpAPI
- `src/lib/services/admin-dashboard-service.ts` — SerpAPI-Metriken
- `src/lib/admin/navigation.ts` — Label „APIs & Integrationen“
- `src/lib/services/admin-platform-service.ts` — `google_custom_search` aus Provider-Liste entfernt

### Google Analyse

- `src/lib/analysis/google/custom-search.ts` — nutzt ausschließlich SearchProvider/SerpAPI
- `src/lib/analysis/google/run-analysis.ts` — `sourceType: serpapi_google`
- `src/lib/analysis/types.ts` — Hit-Source aktualisiert
- `src/lib/analysis/gemini-summary.ts` — Filter auf `serpapi_google`
- Report-/Modul-Texte ohne CSE-Bezug

### Docs / Config / Tests

- `README.md` — SerpAPI-Konfiguration, Test, Architektur
- `.env.example` — `SERPAPI_API_KEY` statt CSE-Vars
- `docs/SPRINT_6A_SERPAPI_ABSCHLUSSBERICHT.md` — dieser Bericht
- Unit-Tests: Migrations, SerpApiProvider, Google Intelligence

---

## Datenbankänderungen

Neue Tabelle `search_provider_settings`:

| Spalte                                               | Zweck                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `provider`                                           | z. B. `serpapi` (UNIQUE — mehrere Provider parallel möglich) |
| `enabled`                                            | Aktiv/Inaktiv                                                |
| `encrypted_api_key`                                  | AES-256-GCM                                                  |
| `status`                                             | `unknown` / `online` / `offline`                             |
| `last_check_at` / `last_success_at` / `last_error_*` | Health                                                       |
| `average_response_time_ms`                           | Ø Latenz                                                     |
| `daily_requests` + `daily_requests_date`             | Tageszähler                                                  |
| `total_requests` / `total_errors`                    | Gesamt + Fehlerquote                                         |
| `api_version`                                        | sofern verfügbar                                             |
| `config_json`                                        | Erweiterungen                                                |

Seed: Provider `serpapi` mit Status `unknown`.

---

## Neue API-Routen

| Methode | Pfad                                | Aktion                                               |
| ------- | ----------------------------------- | ---------------------------------------------------- |
| `GET`   | `/api/admin/search-provider`        | Public Settings + Provider-Liste (ohne Klartext-Key) |
| `PUT`   | `/api/admin/search-provider`        | API-Key speichern (Admin + CSRF)                     |
| `POST`  | `/api/admin/search-provider/test`   | Echte SerpAPI-Probe, Status/Metriken speichern       |
| `GET`   | `/api/admin/search-provider/status` | Dashboard-Übersicht                                  |

Alle Routen: nur `role === admin`.

---

## Adminbereich

**Website → APIs & Integrationen**

1. **Suchanbieter (Search Provider)** — Beschreibung, Provider-Dropdown (SerpAPI Standard;
   DataForSEO / Bing / Custom vorbereitet), Passwortfeld, Speichern, Testen, Statuskarten
2. **Weitere Integrationen** — Gemini & Co. (ohne Google Custom Search)

**Admin-Dashboard:** API Status SerpAPI — ONLINE/OFFLINE, letzter Erfolg, Requests heute/gesamt,
Fehlerquote, Ø Antwortzeit.

---

## Sicherheit

- API-Key nie im Frontend im Klartext
- Speicherung nur verschlüsselt (`IMAGE_ENCRYPTION_KEY` / `SESSION_SECRET`)
- Speichern & Testen nur für Administratoren
- Maskierte Anzeige (`••••last4`)

---

## Getestete Funktionen (automatisch)

- TypeScript (`npm run typecheck`)
- ESLint (`npm run lint`)
- Unit-Tests (`npm run test`) — u. a. SerpAPI normalize/healthCheck, Migrations 015, Google Intelligence ohne erfundene Hits
- Production Build (`npm run build`)
- Repo-Scan: keine aktiven Referenzen auf Google Custom Search JSON API / `googleapis.com/customsearch`

Manuell auf dem Server empfohlen:

- Key speichern im Admin
- Testbutton (grüne/rote Statuskarte, Antwortzeit)
- Google Analyse mit konfiguriertem SerpAPI-Key

---

## Offene Punkte für Sprint 6B

1. **Weitere Provider** implementieren (DataForSEO, Bing Search, Custom) inkl. UI-Freischaltung
2. **Provider-Failover / Parallelbetrieb** — mehrere aktive Provider mit Priorität
3. **Request-Budgets & Alerts** — Soft-Limits, Admin-Benachrichtigung bei Fehlerquote/Rate-Limit
4. **Image-/News-Suche** in der Google-Analyse nutzen (`searchImages` / `searchNews` bereits am Interface)
5. **Dashboard-Historie** — Zeitreihe der SerpAPI-Latenz und Request-Volumen
6. Alte `api_credentials`-Zeilen für `google_custom_search` (falls vorhanden) per Cleanup-Migration entfernen
7. Optional: Env-only Modus dokumentieren vs. ausschließlich DB-Key in Production erzwingen

---

## Deploy-Hinweis

```bash
cd /opt/synsight
git fetch origin
git reset --hard origin/cursor/serpapi-search-provider-7c12
rm -rf node_modules .next
npm ci
DATABASE_URL='…' npm run db:migrate
DATABASE_URL='…' npm run build
pm2 restart ecosystem.config.cjs --update-env
```

Anschließend unter Admin den SerpAPI-Key speichern und „API Verbindung testen“.
