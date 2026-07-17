# Sprint 6C — Preismanagement, Bildverwaltung und finale UX

**Branch:** `cursor/pricing-images-ux-7c12`  
**Basis:** Sprint 6A + 6B  
**Stand:** 17. Juli 2026

## Ergebnis

SynCredits-Pakete und Analysepreise besitzen jetzt eine einzige produktive
Quelle: MariaDB. Landingpage, Dashboard, Analyseabbuchung und Administration
verwenden denselben Service-/Repository-Pfad. Preisänderungen benötigen keinen
Build und keinen Code-Deploy.

Die Bildpipeline speichert Uploads sofort in der Datenbank, verschlüsselt das
Original, erstellt zwei WebP-Derivate und stellt authentifizierte Thumbnails
in Profil und Dashboard bereit.

## Fehlerbehebung (Ursachen, nicht Symptome)

### PM2 / falsche DATABASE_URL

Ursache: stale Shell-/PM2-Werte konnten die Produktionsdatei überlagern.

Fix:

- `deployment/env-file.cjs` kapselt Parsing und Merge.
- `.env.production` überschreibt stale Prozesswerte.
- Regressionstest prüft quoted values und Merge-Priorität.

### SMTP-Timeout / Registrierung 504 nach DB-Insert

Ursache: Registrierung wartete früher nach erfolgreichem Insert auf SMTP.

Fix:

- E-Mail-Versand bleibt nicht-blockierend.
- SMTP besitzt Connection-/Greeting-/Socket-Timeouts.
- Ein fehlgeschlagenes Credit-Konto-Setup kann eine bereits persistierte
  Registrierung ebenfalls nicht mehr abbrechen.
- Regressionstest simuliert einen nie antwortenden SMTP-Provider und prüft,
  dass die Token-Erstellung sofort zurückkehrt.

## Migration 009

`database/migrations/009_pricing_and_image_hardening.sql`

### Neue Tabelle `analysis_pricing`

- `analysis_key` (unique)
- `label`, `description`
- `credits`
- `sort_order`, `is_active`
- Factory-Defaults für sicheren Admin-Reset
- `updated_by_admin_id`
- Zeitstempel

### Erweiterte Tabelle `credit_packages`

- `default_credits`
- `default_bonus_credits`
- `default_price_cents`
- `is_popular`
- `updated_by_admin_id`

### Bildhärtung

- Doppelte Bildtypen werden bereinigt.
- Unique-Key `(user_id, image_type)`.

## Analysepreise (DB-Defaults)

| Analyse                              | SynCredits |
| ------------------------------------ | ---------: |
| Google Suche                         |          2 |
| Telefonnummer                        |          6 |
| Email Analyse                        |          6 |
| Website Analyse                      |          5 |
| Domain Analyse                       |          5 |
| Alias Analyse                        |          8 |
| Social Media Analyse                 |         10 |
| Personensuche                        |         15 |
| Reverse Image Search                 |         25 |
| KI-Zusammenfassung                   |         20 |
| PDF Report                           |         10 |
| Deep Intelligence Analyse            |         60 |
| Komplette Digitale Identitätsanalyse |        100 |

Neue Analysearten können im Adminbereich ohne Codeänderung angelegt werden.

## Preis-APIs

Öffentlich / Benutzer:

- `GET /api/pricing`
- `GET /api/credits/quote?analysisKey=...`

Admin-only:

- `GET /api/admin/pricing`
- `PUT /api/admin/pricing`
- `GET /api/admin/packages`
- `PUT /api/admin/packages`

Admin-Funktionen:

- Analysepreise ändern
- Analysearten hinzufügen
- Preise aktivieren/deaktivieren
- Paket-Basis-/Bonus-Credits und Preis ändern
- beliebtestes Paket bestimmen
- Standardpreise wiederherstellen
- jede Änderung im Audit-Log protokollieren

## Keine Preislogik im Frontend

- Landingpage lädt Pakete aus `/api/pricing`.
- Dashboard lädt alle Analysepreise über `pricing-service`.
- Analysebestätigung lädt serverseitiges Quote mit Kosten, Guthaben und
  Restguthaben.
- `POST /api/credits/consume` liest den aktiven Preis erneut aus der DB.
- Frontend übermittelt niemals einen abzubuchenden Preis.

TypeScript-Defaults sind ausschließlich Factory-Seed/Reset und
In-Memory-Testdaten; sie sind keine produktive Runtime-Preisquelle.

## Bildverwaltung

### Speicherung und Persistenz

- Upload schreibt sofort in `profile_images`.
- Maximal vier eindeutige Typen serverseitig + DB-Unique-Key.
- Austausch eines Typs ersetzt den Datensatz atomar.
- Entfernen löscht DB-Referenz und private Dateien.
- Profil und Dashboard laden Thumbnails nach erneutem Login aus der DB.
- Authentifizierte Thumbnail-Route:
  `GET /api/identity/images/:type/thumbnail`

### Verarbeitung

| Artefakt    | Verarbeitung                               |
| ----------- | ------------------------------------------ |
| Original    | AES-256-GCM verschlüsselt (`original.bin`) |
| Analysebild | WebP, max. 1600×1600, Qualität 80          |
| Thumbnail   | WebP, max. 300×300, Qualität 75            |

Zusätzlich:

- max. 8 MB
- Magic-Byte- und Sharp-Decoding-Prüfung
- EXIF-Rotation
- SHA-256-Inhaltshash
- Path-Traversal-/User-Ownership-Schutz
- Upload-Rate-Limit
- `IMAGE_ENCRYPTION_KEY` in Production zwingend

## Wirtschaftlichkeitsanalyse

### Annahmen

Offizielle Gemini-2.5-Flash-Preise (Abruf 17.07.2026):

- Input Text/Bild/Video: **0,30 USD / 1 Mio. Tokens**
- Output inkl. Thinking: **2,50 USD / 1 Mio. Tokens**
- Google-Search-Grounding nach Freikontingent:
  **35 USD / 1.000 grounded prompts**

Quellen:

- https://ai.google.dev/gemini-api/docs/pricing
- https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing

Konservative Erlösbasis: größtes Paket (niedrigster Erlös pro Credit):

`60 € / 7.800 = 0,00769 € je SynCredit`

Schätzung mit 1 USD = 0,92 EUR:

| Klasse                             | Beispielannahme       | Gemini-Kosten |   Umsatz | Rohertrag* |
| ---------------------------------- | --------------------- | ------------: | -------: | ---------: |
| Google (2 Cr, ohne paid grounding) | 2k Input / 500 Output |     ~0,0017 € | 0,0154 € |      ~89 % |
| Website/Domain (5 Cr)              | 5k / 1,5k             |     ~0,0048 € | 0,0385 € |      ~87 % |
| Email/Telefon (6 Cr)               | 5k / 1,5k             |     ~0,0048 € | 0,0462 € |      ~90 % |
| Alias (8 Cr)                       | 5k / 1,5k             |     ~0,0048 € | 0,0615 € |      ~92 % |
| Social (10 Cr)                     | 5k / 1,5k             |     ~0,0048 € | 0,0769 € |      ~94 % |
| Personensuche (15 Cr)              | 5k / 1,5k             |     ~0,0048 € | 0,1154 € |      ~96 % |
| KI Summary (20 Cr)                 | 8k / 2k               |     ~0,0068 € | 0,1538 € |      ~96 % |
| Reverse Image (25 Cr)              | 8k / 1,5k             |     ~0,0057 € | 0,1923 € |      ~97 % |
| Deep Intelligence (60 Cr)          | 20k / 4k              |     ~0,0147 € | 0,4615 € |      ~97 % |
| Komplettanalyse (100 Cr)           | 40k / 8k              |     ~0,0294 € | 0,7692 € |      ~96 % |

\*Vor Umsatzsteuer, Zahlungsgebühren, externen Such-APIs, Server, Speicher,
Traffic, Support und Entwicklung.

### Kritischer Hinweis Google Grounding

Ein kostenpflichtiger grounded prompt kostet nach Freikontingent rund
`0,035 USD` (~0,032 EUR) zusätzlich. Bei 2 SynCredits beträgt der konservative
Umsatz nur 0,0154 EUR: **negative Marge**. Deshalb muss Production entweder:

1. Grounding im Freikontingent hart begrenzen,
2. eine günstigere Suchquelle verwenden, oder
3. den Google-Suche-Preis im Adminbereich erhöhen.

Die Admin-Preisverwaltung ermöglicht diese Korrektur ohne Deployment.

## Geänderte / neue Dateien

### Datenbank und Deployment

- `database/migrations/009_pricing_and_image_hardening.sql`
- `deployment/env-file.cjs`
- `ecosystem.config.cjs`
- `src/lib/database/schema.ts`
- `src/lib/config/env.ts`

### Pricing Backend

- `src/lib/repositories/pricing-repository.ts`
- `src/lib/repositories/mysql/pricing-repository.ts`
- `src/lib/services/pricing-service.ts`
- `src/lib/validation/admin-pricing.ts`
- `src/lib/credits/pricing.ts`
- `src/lib/services/credits-service.ts`
- `src/lib/validation/credits.ts`
- `src/app/api/pricing/route.ts`
- `src/app/api/credits/quote/route.ts`
- `src/app/api/admin/pricing/route.ts`
- `src/app/api/admin/packages/route.ts`

### Pricing UI

- `src/components/admin/AdminPricingControl.tsx`
- `src/components/sections/SynCreditsSection.tsx`
- `src/components/dashboard/CreditsPanel.tsx`
- `src/components/credits/ConsumeConfirm.tsx`
- `src/components/sections/DemoScanner.tsx`
- `src/components/dashboard/DashboardSidebar.tsx`
- `src/app/(platform)/admin/page.tsx`

### Bilder

- `src/lib/media/image-pipeline.ts`
- `src/lib/media/profile-image-upload.ts`
- `src/lib/repositories/identity-repository.ts`
- `src/lib/repositories/mysql/identity-repository.ts`
- `src/lib/services/identity-service.ts`
- `src/app/api/identity/images/route.ts`
- `src/app/api/onboarding/images/route.ts`
- `src/app/api/identity/images/[type]/route.ts`
- `src/app/api/identity/images/[type]/thumbnail/route.ts`
- `src/components/profile/IdentityProfilePanel.tsx`
- `src/app/(platform)/dashboard/page.tsx`
- `src/lib/validation/identity.ts`
- `src/lib/validation/onboarding.ts`

### Tests

- Pricing-Service/Admin-API/Migrationstests
- Bildpipeline- und Persistenztests
- Duplicate-Type-Validation
- PM2-Env-Priorität
- nicht-blockierender SMTP-Regressionstest

## Server-Update

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/pricing-images-ux-7c12
git pull origin cursor/pricing-images-ux-7c12
npm ci

DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run db:status
DATABASE_URL='mysql://synsight:DEIN_PASSWORT@localhost:3306/synsight' npm run build

sudo mkdir -p /var/lib/synsight/private
sudo chown -R "$(id -un)":"$(id -gn)" /var/lib/synsight/private
chmod 700 /var/lib/synsight/private

pm2 delete synsight
pm2 start ecosystem.config.cjs --update-env
pm2 save
```

Erforderlich in `.env.production`:

```dotenv
PRIVATE_STORAGE_ROOT=/var/lib/synsight/private
IMAGE_ENCRYPTION_KEY=EIGENER_ZUFAELLIGER_SCHLUESSEL_MINDESTENS_32_ZEICHEN
```

Wichtig: `IMAGE_ENCRYPTION_KEY` nach dem ersten produktiven Upload sichern und
nicht ändern, sonst können verschlüsselte Originale nicht mehr gelesen werden.

## Produktionsreife

- DB-basierte Runtime-Preise: produktionsreif
- Admin-Preisverwaltung/Audit: produktionsreif
- Credit-Abbuchung mit Live-Preis: produktionsreif
- Bildverarbeitung/Persistenz: produktionsreif
- Externe Zahlungsanbieter: weiterhin vorbereitet, noch nicht live angebunden
- Google Grounding: Kostenlimit vor unbegrenzter Production-Nutzung erforderlich
