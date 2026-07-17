# Sprint 6E – SynSight Explainability & User Guidance

## Zusammenfassung

SynSight erklärt jetzt zentrale Funktionen verständlich für technisch unerfahrene Nutzer. Ein einheitliches Info-System (ⓘ) wurde auf Landingpage, Dashboard, Registrierung, Profil und Adminbereich ausgerollt.

## Neue Komponenten

| Komponente                  | Pfad                                | Zweck                                           |
| --------------------------- | ----------------------------------- | ----------------------------------------------- |
| **InfoTooltip** (erweitert) | `src/components/ui/InfoTooltip.tsx` | Hover/Focus auf Desktop, HelpModal auf Mobile   |
| **HelpModal**               | `src/components/ui/HelpModal.tsx`   | Vollständige Erklärung auf kleinen Bildschirmen |
| **InfoPanel**               | `src/components/ui/InfoPanel.tsx`   | Freundliche Leerzustände statt „Keine Daten“    |
| **InfoHeading**             | `src/components/ui/InfoHeading.tsx` | Überschrift + Info-Icon kombiniert              |
| **Guidance Content**        | `src/lib/content/guidance.ts`       | Zentraler Erklärungstext                        |

## Erweiterte Bereiche

### Landingpage

- Digitale Spuren, Datenlecks, KI-Analyse, SynCredits, Vertrauen
- Info-Icons pro Karte und Sektion

### Dashboard

- Sicherheitsstatus → „Sicherheitsbewertung“
- SynCredits, Risikoanalyse, Empfehlungen, Analysezentrum
- ConsumeConfirm mit Was/Warum/Ergebnis vor Analysestart
- Freundliche Leerzustände bei Abbuchungen

### Registrierung

- Erklärungen für Vorname, Nachname, E-Mail, Passwort

### Admin

- Benutzerverwaltung, Preisverwaltung, Promotionen
- Leerzustand bei fehlenden Promotionen

### Profil

- Bereits vorhandene InfoTooltips (Sprint 5) bleiben erhalten

## UX-Verbesserungen

- Keine nackten „Keine Daten“-Meldungen mehr
- Fachbegriffe vermieden oder erklärt (z. B. „Sicherheitsbewertung“ statt Score)
- Mobile: Erklärungen als Modal statt abgeschnittener Tooltip
- Tastatur: Escape schließt Hilfe, Fokus-Ringe vorhanden

## Qualitätssicherung

| Gate               | Ergebnis |
| ------------------ | -------- |
| TypeScript         | ✓        |
| ESLint             | ✓        |
| Vitest (103 Tests) | ✓        |
| Build              | ✓        |

## Server-Update

**Keine Datenbank-Migration nötig** – reiner Frontend-/Content-Sprint.

```bash
cd /var/www/synsight
git fetch origin
git checkout cursor/explainability-guidance-7c12
git pull origin cursor/explainability-guidance-7c12
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```

Hard-Refresh im Browser: `Strg + F5`

## Offene Punkte

- Weitere Landing-Sections (Hero, Demo-Scanner) können optional noch Info-Icons erhalten
- ConsumeConfirm ist im Analysezentrum eingebunden; weitere Analysearten folgen mit Live-Daten
