# Sprint 6A — Google Analyse 2.0 · Abschlussbericht

**Branch:** `cursor/sprint-6a-google-osint-7c12`  
**Datum:** 23. Juli 2026  
**Status:** Implementiert · Typecheck / ESLint / Tests grün

---

## Ziel

Vollständige Überarbeitung der Google-Analyse zu einem professionellen Enterprise-OSINT-Report (NASA / JARVIS / CrowdStrike-Stil), ohne Regressionen und ohne erfundene Daten.

---

## Flow (wie spezifiziert)

1. **Analyse Center** → Google Analyse wählen
2. **Bestätigungsdialog** mit Erklärung, Kosten (SynCredits), Dauer (ca. 30–90 Sekunden)
3. SynCredits werden abgebucht
4. Automatischer Wechsel ins **Ergebnis Center** (`?tab=google_search&scan=1`)
5. **SOC-Scan-Animation** (ca. 7–10 Sekunden) mit Statusmeldungen und Fortschrittsbalken
6. **Enterprise Report** erscheint abschnittsweise

---

## Ergebnis Center — Reiter

| Reiter          | Status      |
| --------------- | ----------- |
| Google Analyse  | Live        |
| Telefon Analyse | Platzhalter |
| E-Mail Analyse  | Platzhalter |
| Social Analyse  | Platzhalter |
| Darknet Analyse | Platzhalter |
| Bildanalyse     | Platzhalter |

---

## Report-Inhalte

- Überschrift: „Was Google über \<Name\> öffentlich finden konnte“
- **Management Summary** mit KPIs (Treffer, Webseiten, Social, E-Mail, Telefon, Risiko …)
- Optional **KI-Zusammenfassung** (Gemini) — nur über verifizierte Treffer, keine Erfindung
- Risikobewertung (Ring / Übersicht)
- Detailkategorien: Webseiten, Social, Bilder, Telefon, E-Mail, Unternehmen, Dokumente, Presse, Foren, Sonstige
- Pro Kategorie: Trefferliste + visuelle Auswertung (Ring + Risiko-Balken)
- Pro Treffer: Quelle, Titel, URL, Snippet, Kategorie, Datum, Relevanz, Risiko, Empfehlung
- Handlungsempfehlungen mit Warum / Gefahr / Behebung / Aufwand / Priorität / Schwierigkeit

---

## Datenintegrität

- Nur Google Custom Search API + explizite Profil-Verknüpfungen
- Keine simulierten SERP-Treffer
- Leere Ergebnisse werden professionell als valides Ergebnis dargestellt
- Gemini (optional via `GEMINI_API_KEY`) fasst ausschließlich gelieferte Hits zusammen

---

## Persistenz

- Migration `013_intelligence_reports.sql`
- Tabelle `intelligence_reports` (JSON-Report pro User + Modul)
- In-Memory-Cache + DB-Upsert

---

## Umweltvariablen

```bash
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=
GEMINI_API_KEY=   # optional
```

---

## Qualitätschecks

| Check                              | Ergebnis |
| ---------------------------------- | -------- |
| TypeScript                         | ✓        |
| ESLint                             | ✓        |
| Unit-Tests (155)                   | ✓        |
| Keine erfundenen Daten             | ✓        |
| SynCredits-Abbuchung vor Scan      | ✓        |
| Report speicherbar / erneut öffnen | ✓        |

---

## Deploy

```bash
cd /opt/synsight
git fetch origin
git reset --hard origin/cursor/sprint-6a-google-osint-7c12
rm -rf node_modules .next
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```

---

## Manueller Testplan

1. Identitätsprofil mit Name, E-Mail, Telefon, Social-URL füllen
2. Analyse Center → Google → „Analyse starten“ → SynCredits bestätigen
3. Landung im Ergebnis Center → Scan-Animation → Report
4. Management Summary und Kategorien prüfen
5. Seite neu laden → Report bleibt erhalten
6. Ohne Google API: keine erfundenen Treffer, klarer Hinweis
