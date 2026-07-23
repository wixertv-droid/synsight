# Google Results UX · Speicherdauer · Abschlussbericht

**Branch:** `cursor/google-results-ux-retention-7c12`  
**Datum:** 23. Juli 2026  
**Status:** Implementiert · Typecheck / ESLint / Tests (177) / Build grün

---

## Ziel

Nach dem Scan (502 / Refresh), Speicherdauer wählbar machen, Suchanfragen zuklappen,
Trefferqualität verbessern und die Ergebnis-Darstellung kompakter machen.

---

## Geänderte Dateien (Kern)

- `database/migrations/016_intelligence_report_retention.sql`
- `src/lib/analysis/retention.ts`
- `src/lib/analysis/hit-quality.ts`
- `src/lib/analysis/session-store.ts`
- `src/lib/analysis/types.ts` / `normalize-report.ts`
- `src/lib/analysis/google/run-analysis.ts` — parallele Suche + Qualitätsfilter + Retention
- `src/app/api/analysis/google/run/route.ts` — `retentionDays`, `maxDuration=120`
- `src/components/analysis/google/GoogleIntelligenceReport.tsx`
- `src/components/analysis/google/GoogleAnalysisPageClient.tsx`
- `src/components/dashboard/results/ResultsCenterClient.tsx`
- `src/components/analysis/intelligence/CategoryVisualPanel.tsx`

---

## Datenbank

`intelligence_reports`:

- `retention_days` (Default 30)
- `expires_at` (NULL = unbegrenzt)

Abgelaufene Reports werden beim Laden entfernt.

---

## Speicherdauer (Auswahl)

| Option     | Bedeutung                |
| ---------- | ------------------------ |
| 1 Tag      | Kurz speichern           |
| 7 Tage     | Eine Woche               |
| 30 Tage    | Standard                 |
| 90 Tage    | Ein Quartal              |
| Unbegrenzt | Bis zur nächsten Analyse |

Wählbar bei Analyse-Start und im Ergebnis Center.

---

## UI

- **AUSGEFÜHRTE SUCHANFRAGEN** standardmäßig zugeklappt
- Schwache Treffer ausgeblendet (Toggle)
- Rechte Visual-Boxen: `items-start` + sticky, keine Streckung mehr
- 502/504: automatischer Retry über `/api/analysis/google/latest`

---

## Deploy

```bash
cd /opt/synsight
git fetch origin
git reset --hard origin/cursor/google-results-ux-retention-7c12
rm -rf node_modules .next
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```

Optional nginx: `proxy_read_timeout 120s;` für `/api/analysis/`.
