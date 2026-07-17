# Sprint 6D – Abschlussbericht

## Zusammenfassung

Sprint 6D liefert ein produktionsreifes Promotion-System, automatische Willkommensboni nach E-Mail-Verifizierung, revisionssichere Protokollierung, session-bewusste Landingpage-Navigation, sichtbaren Logout-Workflow und Dashboard-Willkommensbanner.

## Geänderte / neue Dateien

### Datenbank

- `database/migrations/010_promotions.sql`

### Schema & Repositories

- `src/lib/database/schema.ts`
- `src/lib/repositories/promotions-repository.ts`
- `src/lib/repositories/mysql/promotions-repository.ts`
- `src/lib/repositories/index.ts`
- `src/lib/repositories/credits-repository.ts` (`transactionSource: promotion`)
- `src/lib/repositories/audit-repository.ts` (`promotion.granted`)

### Services & Validation

- `src/lib/services/promotions-service.ts`
- `src/lib/services/verification-service.ts`
- `src/lib/services/auth-service.ts`
- `src/lib/validation/admin-promotions.ts`

### API

- `src/app/api/admin/promotions/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/promotions/notifications/route.ts`
- `src/app/api/auth/logout/route.ts`

### UI

- `src/components/admin/AdminPromotionsControl.tsx`
- `src/components/dashboard/PromotionWelcomeBanner.tsx`
- `src/components/dashboard/LogoutButton.tsx`
- `src/components/dashboard/DashboardShell.tsx`
- `src/components/dashboard/DashboardSidebar.tsx`
- `src/components/layout/Navbar.tsx`
- `src/app/(platform)/admin/page.tsx`
- `src/app/(platform)/dashboard/page.tsx`

### Tests

- `tests/unit/services/promotions-service.test.ts`
- `tests/unit/api/admin-routes.test.ts`
- `tests/unit/database/migrations.test.ts`
- `tests/helpers/memory-reset.ts`

## Neue Datenbanktabellen

| Tabelle             | Zweck                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| `promotions`        | Promotion-Konfiguration (Zeitraum, Code, Zielgruppe, Budget)          |
| `promotion_rewards` | Vergabe pro Benutzer inkl. Transaktionsreferenz & Notification-Status |
| `promotion_logs`    | Revisionssichere Audit-Einträge jeder Bonusvergabe                    |

Seed: **Willkommensbonus** mit 250 SynCredits für neue Benutzer (aktiv).

## Neue API-Endpunkte

| Methode | Pfad                            | Zugriff                                     |
| ------- | ------------------------------- | ------------------------------------------- |
| GET     | `/api/admin/promotions`         | Admin                                       |
| PUT     | `/api/admin/promotions`         | Admin (create/update/activate/delete)       |
| GET     | `/api/auth/session`             | Öffentlich (Session-Status für Landingpage) |
| GET     | `/api/promotions/notifications` | Authentifiziert                             |
| POST    | `/api/promotions/notifications` | Authentifiziert (Banner quittieren)         |

## Services & Repositories

- **PromotionsRepository** – CRUD, Statistik, Rewards, Logs, Notification-Queue
- **promotions-service** – Eligibility, automatische Vergabe, Admin-Katalog, Lifecycle (`active/planned/expired/inactive`)

## Qualitätssicherung

| Gate               | Ergebnis |
| ------------------ | -------- |
| TypeScript         | ✓        |
| ESLint             | ✓        |
| Vitest (100 Tests) | ✓        |
| Build              | ✓        |

Abgedeckt: Promotion CRUD, Aktivierung, Willkommensbonus nach Verifizierung, Einmalvergabe, Teilnehmerlimit, Admin-API-Schutz, Migration 010.

## Sicherheit

- Admin-APIs: Session + Rollenprüfung + CSRF auf Mutationen
- Geschützte Routen: Middleware + Platform-Layout (unverändert, defense in depth)
- Promotion-Logs: Benutzer, Promotion, Credits, Admin, Transaktions-ID, Zeitstempel
- Session-API liefert nur minimale öffentliche Nutzerdaten (kein Token-Leak)

## Performance

- Promotion-Eligibility: O(n) über aktive Auto-Promotions (typisch 1–5 Einträge)
- Landingpage-Session-Check: ein leichtgewichtiger GET ohne DB-Joins über `getCurrentUser`
- Keine zusätzlichen Blocking-Calls im Registrierungsflow

## Produktionsreife

**Freigabe empfohlen** nach Migration `010_promotions.sql` auf dem Server.

## Offene Punkte

- Promo-Code-Einlösung für bestehende Benutzer (Architektur vorbereitet, UI/API für manuelle Einlösung optional in Sprint 6E)
- Middleware prüft weiterhin nur Token-Signatur, nicht DB-Revocation (bestehendes Verhalten)

## Server-Update

```bash
cd /var/www/synsight   # oder Ihr Projektpfad
git fetch origin
git checkout cursor/promotions-session-ux-7c12
git pull origin cursor/promotions-session-ux-7c12
npm ci
npm run db:migrate
npm run build
pm2 restart ecosystem.config.cjs --update-env
pm2 logs synsight --lines 50
```

Prüfen:

1. `GET /api/auth/session` als Gast → `authenticated: false`
2. Nach Login Landingpage → Dashboard / Abmelden sichtbar
3. Neuer User registrieren → E-Mail verifizieren → 250 SynCredits
4. Admin → Promotionen → Willkommensbonus sichtbar
