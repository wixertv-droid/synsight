# Sprint RC-2 — System Hardening & Integration — Abschlussbericht

**Branch:** `cursor/sprint-rc2-hardening-7c12`  
**Datum:** 2026-07-25  
**Scope:** ausschließlich Audit-Fixes — keine neuen Analysemodule, keine Designänderungen

---

## 1. Geänderte Dateien (Kern)

### Neu

- `src/lib/analysis/assert-runnable.ts` — zentrales Modul-/Credits-Gate
- `database/migrations/025_rc2_hardening.sql` — Unique `(user_id, request_id)`, Alias/Person deaktivieren
- `src/lib/services/password-reset-service.ts` + Auth-Seiten/APIs Forgot/Reset
- `src/lib/email/templates/password-reset-email.ts`
- `src/lib/security/rate-limit-store.ts` — Redis-vorbereitete Architektur
- `src/lib/security/safe-redirect.ts` — sicheres `?from=`
- `src/lib/dashboard/build-threats-from-reports.ts` — echte Threat-Daten
- `src/app/api/promotions/redeem/route.ts` + `PromoRedeemForm`
- Unit-Tests: assert-runnable, password-reset, threats, …

### Wesentlich geändert

- Analyse-Run-Routen Google / Digital Leak / Username → `assertAnalysisRunnable`
- `ConsumeConfirm` + PageClients + `ResultsCenterClient` → `requestId`
- Catalog: kein Force-Activate Leak, keine Public-Injection inaktiver Module
- ResultsCenter: keine `available: true` FALLBACKs
- Dashboard: dynamisch über aktive Module inkl. Username
- Credits: idempotentes Consume; Instant Checkout nur DEV
- Admin: DB-Rollenprüfung; SortOrder-Fix
- Google→DeHashed nur wenn Leak-Modul aktiv
- Session: kein Fallback auf JWT-Claims ohne DB-Session
- Promotionen: Code-Einlösung für Bestandskunden

---

## 2. Behobene Audit-Fehler

| ID                                           | Status                                                    |
| -------------------------------------------- | --------------------------------------------------------- |
| **B-01** Server-seitiges SynCredits-Gate     | ✓ vor jedem Run                                           |
| **B-02** `assertAnalysisRunnable(moduleKey)` | ✓ zentral, alle Run-Routes                                |
| **B-03** Module wirklich deaktivieren        | ✓ Catalog/UI/Results ohne Injection/FALLBACK              |
| **H-01** Provider Gate                       | ✓ Provider nur nach Gate; DeHashed zusätzlich Leak-aktiv  |
| **H-02** Dashboard dynamisch                 | ✓ Adapter-Registry über aktive Module                     |
| **H-03** Passwort Reset                      | ✓ Request, E-Mail, Token, Ablauf, Reset, RateLimit, Audit |
| **H-04** Consume idempotent                  | ✓ `requestId` + Unique Index + Retry-Schutz               |
| **H-05** Instant Checkout                    | ✓ nur DEV (`CREDITS_CHECKOUT_MODE=instant` + non-prod)    |
| **H-06** Result Center FALLBACK              | ✓ entfernt; leerer Catalog → keine Tabs                   |
| **M-01** Einheitliche Finanzanzeige          | ✓ Username sync mit Pricing; bestehende Finance-Views     |
| **M-02** Profil Readiness                    | ✓ gefiltert nach aktiven Modulen                          |
| **M-03** person_search                       | ✓ Widget bereinigt; default inaktiv                       |
| **M-04** Promotionen Bestandskunden/Code     | ✓ Redeem-API + UI im CreditsPanel                         |
| **M-05** Login `?from=`                      | ✓ safe redirect                                           |
| **M-06** Admin JWT + DB                      | ✓ `getAdminAccess` + Session ohne Claim-Fallback          |
| **M-07** alias_analysis                      | ✓ ersetzt/deaktiviert (Migration + pricing)               |
| **M-08** Google→DeHashed nur bei Leak aktiv  | ✓                                                         |
| **M-09** Rate Limits Redis-Prep              | ✓ Store-Abstraktion                                       |
| **M-10** Admin Sortierung                    | ✓ `sortOrder` statt `row.id`                              |
| **M-11** Threat Center echte Daten           | ✓                                                         |
| **M-12** Pricing / Module Settings SSoT      | ✓ Sync Pricing ↔ Username Settings                        |

---

## 3. Datenbankänderungen

**Migration `025_rc2_hardening.sql`:**

1. Unique Index `usage_logs_user_request_unique` auf `(user_id, request_id)`
2. Deaktivierung: `alias_analysis`, `person_search`, `phone_analysis`, `email_analysis`
3. `username_intelligence.sort_order = 30`

Schema: Unique Index auch in Drizzle `schema.ts`.

---

## 4. Sicherheitsverbesserungen

- Analyse-Runs ohne gültige Credits/`requestId` → HTTP 4xx, kein Provider/KI
- Adminrechte erneut gegen DB-Rolle geprüft
- Session ohne DB-Session wird abgelehnt (kein reines Cookie-Claim-Trust)
- Passwort-Reset: Token-Hash, TTL 1h, RateLimit, Audit, Session-Revoke nach Reset
- Open-Redirect-Schutz für Login-`from`
- Instant-Checkout in Production blockiert
- CSRF weiter über `validateMutationOrigin` auf Mutations

---

## 5. Performanceverbesserungen

- Keine Fake-FALLBACK-Module mehr → weniger unnötige UI/Scan-Pfade
- Rate-Limit-Store vorbereitet für Redis (weniger Memory-Only-Risiko in Multi-Instance später)
- Dashboard lädt Reports nur für aktive, implementierte Module
- Idempotentes Consume verhindert Doppelabbuchung bei Retries

---

## 6. Testergebnisse

| Check                    | Ergebnis                                             |
| ------------------------ | ---------------------------------------------------- |
| `npm run typecheck`      | ✓ bestanden                                          |
| `npm run lint`           | ✓ keine Warnings/Errors                              |
| `npm run test`           | ✓ 270/270                                            |
| `npm run build`          | ✓ bestanden                                          |
| E2E (`npm run test:e2e`) | ✓ 6/6 (Selector-Update an aktuelle Admin-Nav/Logout) |

---

## 7. Produktionsreife

**Geschätzt: 86 %**

(vorher Audit ~58 % Go-live-Nein; Blocker B-01–B-03 und High H-01–H-06 adressiert)

---

## 8. Offene Punkte

- Echter Payment-Provider (Stripe o. Ä.) — Instant absichtlich DEV-only
- Redis Rate-Limit-Adapter noch Stub (Architektur fertig)
- E2E gegen Live-Stack / Produktiv-DB manuell verifizieren
- Optionale Legacy-Demo-Kataloge (`results-demo-data`) weiter bereinigen
- `verification-expired` Seite bleibt als UX-Hinweis (nicht tot, aber Legacy-Pfad)
- Dark Mode / Responsive: keine Design-Änderung in RC-2; bestehendes Layout unverändert

---

## 9. Empfehlung

**✓ bereit für Sprint 7**

Voraussetzungen Deploy:

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/sprint-rc2-hardening-7c12
git pull origin cursor/sprint-rc2-hardening-7c12
npm ci
DATABASE_URL='…' npm run db:migrate
DATABASE_URL='…' npm run db:ensure-catalog
npm run build
pm2 restart ecosystem.config.cjs --update-env
```

Produktiv: `CREDITS_CHECKOUT_MODE` **nicht** auf `instant` setzen; Payment-Provider folgen in Sprint 7.
