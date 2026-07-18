# Sprint 6A — Dashboard Struktur (Abschlussbericht)

**Scope:** Nur UI und Architekturvorbereitung  
**Branch:** `cursor/sprint-6a-dashboard-prod-7c12`  
**(Basis:** Production-Stack `cursor/biometric-design-system-7c12` — nicht der alte UI-only-`main`)  
**Keine APIs · Keine KI · Keine DB · Keine Auth-Änderungen**

---

## Neue Routen

| Route                 | Seite                                             |
| --------------------- | ------------------------------------------------- |
| `/dashboard/analysis` | Analyse Center                                    |
| `/dashboard/results`  | Ergebnis Center                                   |
| `/dashboard/threats`  | Bedrohungen & Schutzmaßnahmen                     |
| `/dashboard`          | Bestehendes Dashboard (erhalten) + Schnellzugriff |

---

## Neue Komponenten

| Komponente                  | Zweck                                        |
| --------------------------- | -------------------------------------------- |
| `DashboardSectionHeader`    | Einheitlicher HUD-Seitenkopf mit ⓘ           |
| `InfoTooltip`               | Kleine Hinweise für unerfahrene Nutzer       |
| `analysis/AnalysisCenter`   | Modul-Übersicht                              |
| `analysis/AnalysisTypeCard` | Karte mit Dauer, SynCredits-Platzhalter, CTA |
| `results/ResultsCenter`     | Status, Funde, Risiko, Empfehlungen (Demo)   |
| `threats/ThreatsCenter`     | Risiko-Level + Bedrohungskarten              |

## Demo-Daten (austauschbar)

| Datei                                       | Inhalt                             |
| ------------------------------------------- | ---------------------------------- |
| `src/lib/dashboard/analysis-center-data.ts` | 13 Analyse-Module (Preis-Katalog)  |
| `src/lib/dashboard/results-demo-data.ts`    | Google / Social / Bild / Leak Demo |
| `src/lib/dashboard/threats-demo-data.ts`    | Niedrig / Mittel / Hoch            |

---

## Navigation

Sidebar erweitert um:

1. Analyse Center → `/dashboard/analysis`
2. Ergebnisse → `/dashboard/results`
3. Bedrohungen → `/dashboard/threats`

Bestehende Hash-Links (Digitale Spuren, Risikoanalyse, Überwachung, Berichte) sowie Profil/Einstellungen bleiben erhalten. Active-State für die neuen Pfade.

---

## Qualitätschecks

- TypeScript: `npx tsc --noEmit`
- ESLint: `npm run lint`
- Build: `npm run build`
- Bestehendes Dashboard weiterhin erreichbar

---

## Nächste Schritte (echte Analyse)

1. Analyse-Start an Job-Queue / Worker anbinden (POST API)
2. SynCredits-Preis je Modul aus Pricing laden und vor Start bestätigen
3. Ergebnisse aus `analysis_reports` / Items persistieren und Ergebnis Center befüllen
4. Bedrohungen aus Risiko-Scores der Reports ableiten
5. Bildanalyse an Referenzbilder + spätere Reverse-Image-Pipeline koppeln
6. Google-/Social-/Leak-Connectoren hinter Feature-Flags schalten
