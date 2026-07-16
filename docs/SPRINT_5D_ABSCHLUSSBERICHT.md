# Sprint 5D — Abschlussbericht

**Branch:** `cursor/sprint-5d-auth-profile-7c12`  
**Ziel:** Professionelle Benutzerverwaltung finalisieren (ohne neue KI-Funktionen)

---

## Flow (neu)

Registrierung → E-Mail bestätigen → Login → Dashboard  
Identitätsprofil ist **freiwillig** unter `/profile` (kein Onboarding-Zwang).

---

## Geänderte / neue Dateien (Auswahl)

### Auth

- `src/components/auth/LoginCard.tsx` — Formular, Stärke, Spinner, kein Auto-Login
- `src/components/auth/EmailVerificationCard.tsx` — Dankes-/Fehlertexte, Resend
- `src/app/api/auth/login/route.ts` — immer `/dashboard`
- `src/app/api/auth/verify-email/route.ts` — Fehlercodes invalid/expired/already
- `src/lib/services/verification-service.ts` — detaillierte Verify-Ergebnisse
- `src/app/(auth)/verification-success/page.tsx` / `verification-expired/page.tsx`
- `src/app/(platform)/layout.tsx` — Onboarding-Gate entfernt
- `src/app/(onboarding)/**` — Redirect auf `/profile`

### Identität

- `database/migrations/005_identity_profile_fields.sql`
- `src/lib/database/schema.ts` — birth/gender/address/previous_locations, social status
- `src/lib/validation/identity.ts`
- `src/lib/repositories/identity-repository.ts` + `mysql/identity-repository.ts`
- `src/lib/services/identity-service.ts` — inkl. Completeness %
- `src/app/api/identity/route.ts` — GET/PUT
- `src/app/api/identity/images/route.ts` — Upload (verschlüsselte Pipeline)
- `src/components/profile/IdentityProfilePanel.tsx`
- `src/app/(platform)/profile/page.tsx` — „Mein Identitätsprofil“
- `src/app/(platform)/dashboard/page.tsx` — Willkommen + Fortschritt

### Tests / Docs

- `tests/unit/services/identity-service.test.ts`
- `tests/unit/database/migrations.test.ts`
- `e2e/auth.spec.ts`
- `docs/SPRINT_5D_ABSCHLUSSBERICHT.md`

---

## Migrationen

| Datei                             | Inhalt                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `005_identity_profile_fields.sql` | `profiles.birth_date`, `gender`, `address_line`, `previous_locations`; `social_accounts.account_status` |

Bestehende 001–004 bleiben Grundlage (MariaDB-Branch).

---

## Tabellen erweitert

- **profiles** — Geburtsdatum, Geschlecht, Adresse, frühere Wohnorte
- **social_accounts** — Status `active` / `former` / `unknown`

Weiter genutzt: aliases, phones, emails, digital_traces, profile_images

---

## Neue API-Endpunkte

| Methode | Pfad                   | Zweck                                          |
| ------- | ---------------------- | ---------------------------------------------- |
| GET     | `/api/identity`        | Vollständiges Identitätsprofil + Completeness  |
| PUT     | `/api/identity`        | Speichern aller freiwilligen Abschnitte        |
| POST    | `/api/identity/images` | Referenzbild (max. 4, Pipeline wie Onboarding) |

Auth-Endpunkte unverändert (register/login/verify/resend/logout), Verhalten geschärft.

---

## Tests

- Unit: Identity save/completeness, Migration 005
- Bestehende Auth/Verification-Tests
- E2E: Login-Button „Anmelden“, Dashboard ohne Onboarding-Zwang

---

## Offene Punkte

1. Produktiv-E-Mail-Provider (`EMAIL_DELIVERY_MODE=provider`) noch nicht angebunden
2. Thumbnail-Vorschau im UI zeigt Metadaten, keine Inline-Preview der privaten Dateien
3. PR gegen `main` kann Merge-Konflikte mit älteren Branches erben — Basis ist MariaDB-Branch
4. Passwort-Reset-UI existiert als Schema, aber noch nicht als Produktfläche

---

## Server

```bash
git fetch origin
git checkout cursor/sprint-5d-auth-profile-7c12
git pull
npm ci
npm run db:migrate
npm run db:seed
```
