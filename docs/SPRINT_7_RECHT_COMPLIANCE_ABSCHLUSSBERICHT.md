# Sprint 7 – Recht & Compliance

## Überblick

Vollständiges rechtliches Fundament für SynSight im bestehenden Premium-Design (Navbar, Footer, Glass Panels, HUD, Info-Tooltips). Inhalte sind produktnahe Dokumentation und als Entwurf für eine spätere juristische Endprüfung gekennzeichnet — keine Platzhalter- oder Lorem-Ipsum-Texte.

## Neue / aktualisierte Routen

| Route                  | Seite                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| `/impressum`           | Anbieterkennzeichnung (René Eule, SynSight, Gera)                        |
| `/datenschutz`         | Datenschutzerklärung (Datenarten, Hosting, KI, Rechte)                   |
| `/agb`                 | Allgemeine Geschäftsbedingungen (SynCredits, Missbrauch, Gerichtsstand)  |
| `/cookies`             | Cookie-Richtlinie (nur technisch notwendig + Architektur für Kategorien) |
| `/nutzungsbedingungen` | Nutzungsbedingungen (Verantwortung, Grenzen der Analyse)                 |
| `/security`            | Security & Compliance (Argon2id, HTTPS, Roadmap, Disclosure)             |

## Komponenten

- `LegalDocument` — Shell mit Navbar, Footer, Zurück-Button, Abschnitts-Nav, „Zuletzt aktualisiert“, Glass-Panels
- `LegalPanel` / `LegalList` / `LegalMeta` — wiederverwendbare Dokumentationsbausteine
- Footer: alle Recht-Links + Kontakt
- Navbar: Landing-Anker als `/#…`, damit sie von Unterseiten funktionieren

## Rechtliche Hinweise (offen)

- Texte sind **kein Ersatz für anwaltliche Endprüfung**.
- Vor Einführung optionaler Cookies / Tracking Banner + Einwilligung nachziehen.
- Datenexport-UI (DSGVO Portabilität) ist inhaltlich vorbereitet, technisch noch Roadmap.
- Bei aktiver Umsatzsteuerpflicht Impressum/§19-Hinweis aktualisieren.

## Tests & Qualität

- Unit-Tests für Routen, Footer-Links und Schlüsselinhalte
- TypeScript / ESLint / Vitest / Production Build — grün

## Server-Update

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/sprint-7-legal-compliance-7c12
git pull origin cursor/sprint-7-legal-compliance-7c12
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```

Hard-Refresh: **Strg + F5**
