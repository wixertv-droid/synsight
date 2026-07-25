# SynSight — Final Integration Audit

**Audit-Typ:** Produktfreigabe-Qualitätsprüfung (Integration / Vollständigkeit)  
**Stand:** 2026-07-25  
**Codebasis:** Branch-Linie inkl. Sprint 6E (`username_intelligence`)  
**Methode:** Statische Code-/Architekturprüfung über Frontend, Backend, DB, Admin, APIs, Auth, Finanzen  
**Scope:** Keine Funktionsentwicklung, kein Redesign, keine Optimierungen — nur Befundaufnahme

---

## GESAMTBEWERTUNG

| Bereich              | Bewertung |
| -------------------- | --------: |
| **Gesamt**           |  **68 %** |
| Frontend             |      78 % |
| Backend              |      70 % |
| Datenbank            |      84 % |
| Dashboard            |      69 % |
| AnalyseCenter        |      72 % |
| ErgebnisCenter       |      81 % |
| Adminbereich         |      77 % |
| API                  |      62 % |
| Sicherheit           |      76 % |
| Performance          |      74 % |
| Codequalität         |      71 % |
| Benutzerführung      |      79 % |
| Wartbarkeit          |      73 % |
| **Produktionsreife** |  **58 %** |

### Kurzurteil

Die Plattform ist architektonisch weit fortgeschritten: drei ausführbare Analysen, Admin Control Center, SynCredits, Promotionen, Finanzen und Revisionsspeicher sind vorhanden. **Produktfreigabe ist derzeit nicht empfohlen**, solange drei Blocker offen sind:

1. Analyse-Run-APIs prüfen SynCredits **nicht serverseitig** (kostenlose Läufe möglich).
2. Modul-Deaktivierung greift für Digital Leak / Username **nicht zuverlässig** (Force-Activate / Catalog-Injection).
3. Dashboard integriert Username Intelligence **nicht automatisch**.

---

## 1. MODULPRÜFUNG — Statusübersicht

| Modul / Bereich                                                        | Status           | Bemerkung                                                                     |
| ---------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| Google Intelligence Scan                                               | ✅ implementiert | Run/Latest/Report/Animation; Admin-Deaktivierung nicht serverseitig erzwungen |
| Digital Leak & Exposure                                                | ✅ implementiert | DeHashed; Pricing-Ensure setzt `is_active=1` zurück                           |
| Username Intelligence Scan                                             | ✅ implementiert | Settings + Finance-Parity; Catalog-Injection bei Inaktiv                      |
| Dashboard                                                              | ⚠️ teilweise     | Google + Leak real; Username fehlt; Threats/Teile Demo                        |
| AnalyseCenter                                                          | ⚠️ teilweise     | Catalog-getrieben, aber Injection überschreibt Deaktivierung                  |
| ErgebnisCenter                                                         | ✅ gut           | Drei Module mit Scan-Sequenz + Report-Parity                                  |
| Benutzerprofil / Identity                                              | ✅ gut           | Readiness zeigt auch inaktive/legacy Keys                                     |
| Registrierung                                                          | ✅               | inkl. Rate-Limit, CSRF                                                        |
| Login                                                                  | ✅               | Lockout, Argon2id                                                             |
| E-Mail-Verifizierung                                                   | ✅               | Token + Resend                                                                |
| Passwort-Reset                                                         | ❌ fehlt         | Schema/Zod vorhanden, kein Flow                                               |
| Promotion-System                                                       | ⚠️ teilweise     | New-User auto; Existing/Code-Redeem unvollständig                             |
| SynCredits                                                             | ⚠️ kritisch      | Consume UI ja; Run-API ohne Gate                                              |
| Adminbereich                                                           | ✅ umfangreich   | Module-Settings ungleichmäßig                                                 |
| Finanzbereich                                                          | ⚠️ teilweise     | Username-Finance vollständig; Google/Leak nur Provider-Kosten                 |
| API-Einstellungen                                                      | ✅               | SerpAPI / Gemini / DeHashed                                                   |
| Support / Kommunikation                                                | ✅               | Inbox, Forward, Delete                                                        |
| Website-Einstellungen                                                  | ✅               | System, Module, API, Bilder                                                   |
| Benutzerverwaltung                                                     | ✅               | inkl. Credits, Audit, Profil                                                  |
| Preisverwaltung                                                        | ✅               | Analysen + Pakete                                                             |
| Kontakt / Presse / Partner                                             | ✅               | CSRF, Rate-Limit, Honeypot                                                    |
| Footer / Impressum / Datenschutz / AGB / Cookies / Nutzungsbedingungen | ✅               | Seiten vorhanden                                                              |
| Statusseite                                                            | ✅               | `/status`                                                                     |
| Release Notes                                                          | ✅               | `/changelog`                                                                  |
| Bedrohungsübersicht (`/dashboard/threats`)                             | ⚠️ Demo-Daten    | `threats-demo-data`                                                           |

---

## 2. ADMINPRÜFUNG

| Anforderung                        | Google                              | Digital Leak             | Username                               | Sonstige Katalog-Module  |
| ---------------------------------- | ----------------------------------- | ------------------------ | -------------------------------------- | ------------------------ |
| Aktivieren / Deaktivieren          | ⚠️ Toggle ja, Wirkung unzuverlässig | ❌ Ensure forciert aktiv | ⚠️ Toggle + Settings; Public-Injection | Toggle nur Katalog       |
| Einstellungen (Queries, Limits, …) | ❌                                  | ❌                       | ✅                                     | ❌                       |
| API aktivieren                     | nur Provider-Credentials            | nur DeHashed-Credential  | ✅ `apiEnabled`                        | —                        |
| Kosten / Gewinn                    | Provider-Kostenzeilen               | DeHashed-Kostenzeile     | ✅ eigener Finanzblock                 | —                        |
| SynCredits                         | ✅ Preisverwaltung                  | ✅ Preisverwaltung       | ✅ Settings + Pricing Sync             | ✅ Preisverwaltung       |
| Statistiken                        | Finance Events / Overview           | Events / Logs            | Cost Logs + Events                     | begrenzt                 |
| Berechtigungen                     | Admin-APIs via `getAdminAccess`     | gleich                   | gleich                                 | gleich                   |
| Sichtbarkeit bei Inaktiv           | teilweise                           | **nicht**                | **nicht zuverlässig**                  | ja (wenn nicht injected) |

---

## 3. SICHTBARKEIT BEI DEAKTIVIERUNG — Kernbefund

**Anforderung nicht erfüllt.**

### Ursachen

1. **`ensureDigitalLeakCatalog`** schreibt bei jedem Catalog-Heal `is_active = 1` für `digital_leak_exposure` (`src/lib/credits/ensure-digital-leak-catalog.ts`).
2. **`normalizePublicAnalyses`** injiziert `digital_leak_exposure` und `username_intelligence` in den Public Catalog, wenn sie in der aktiven Liste fehlen (`src/lib/services/pricing-service.ts`) — auch nach bewusster Deaktivierung.
3. **ResultsCenter FALLBACK** markiert Google/Leak/Username als `available: true`, wenn der Catalog fehlschlägt.
4. **Direkte Analyse-URLs / Run-APIs** prüfen `analysis_pricing.is_active` für Google/Leak nicht.
5. **Profil-Readiness** und Dashboard-Texte nennen Module unabhängig vom Catalog.

### Auswirkung

Ein Administrator kann Module **nicht verlässlich** plattformweit ausblenden. Deaktivierte Module können weiter in AnalyseCenter, CreditsPanel, ErgebnisCenter und über Direct-API erscheinen.

---

## 4. DASHBOARD

| Erwartung                            | Ist                                                          |
| ------------------------------------ | ------------------------------------------------------------ |
| Gesamtanalysen / letzte Analysen     | Google + Leak aus Reports                                    |
| SynCredits                           | CreditsPanel / Balance                                       |
| Risiken / Security / Recommendations | aus Google + Leak abgeleitet (`build-dashboard-overview.ts`) |
| Username Intelligence automatisch    | **fehlt** — Overview nimmt nur `{ google, exposure }`        |
| Keine manuelle Pflege neuer Module   | **nicht erfüllt** — Username muss manuell verdrahtet werden  |
| Threats Center                       | Demo-Daten                                                   |
| AnalysisWidget                       | hardcodierter `person_search`-ConsumeConfirm ohne Analyse    |

---

## 5. ERGEBNISCENTER — Einheitlichkeit

| Kriterium                         | Google                               | Leak       | Username   |
| --------------------------------- | ------------------------------------ | ---------- | ---------- |
| Scan-Animation + Mission-Progress | ✅                                   | ✅         | ✅         |
| Management Summary                | ✅                                   | ✅         | ✅         |
| Gauges / Ampeln                   | ✅                                   | ✅         | ✅         |
| KI-Auswertung                     | ✅ Gemini                            | ✅ Gemini  | ✅ Gemini  |
| Empfehlungen priorisiert          | ✅                                   | ✅ SOFORT… | ✅ SOFORT… |
| Info-Buttons                      | ✅                                   | ✅         | ✅         |
| Dark Mode / Responsive            | ✅ (gemeinsames Designsystem)        | ✅         | ✅         |
| `available`-Flag                  | hardcodierte Allowlist der drei Keys |            |            |

**Bewertung:** Die drei Live-Module sind UI-seitig weitgehend paritätisch. Catalog-Module ohne Run bleiben Platzhalter.

---

## 6. API-PRÜFUNG

| Provider / Fläche                             | Gate bei Modul-Inaktiv                                |
| --------------------------------------------- | ----------------------------------------------------- |
| Username → SerpAPI/Gemini                     | ✅ `username_module_settings.isActive` + `apiEnabled` |
| Google → SerpAPI/Gemini (+ optional DeHashed) | ❌ kein `analysis_pricing.is_active`                  |
| Digital Leak → DeHashed/Gemini                | ❌ nur Credential `isActive`                          |
| SynCredits vor Run                            | ❌ **kein** serverseitiger Check in `*/run`           |
| Mail / Support Forms                          | CSRF + Rate-Limit (unabhängig von Analysemodulen)     |

**Kritisch:** Authentifizierter Client kann `POST /api/analysis/{google|digital-exposure|username}/run` ohne vorheriges `/api/credits/consume` ausführen.

---

## 7. FINANZEN

| Modul        | API-Kosten                             | SynCredits | Gewinn/Markup             | Kostenprotokoll           | Admin-UI  |
| ------------ | -------------------------------------- | ---------- | ------------------------- | ------------------------- | --------- |
| Username     | ✅ Settings + Events                   | ✅         | ✅                        | ✅ `username_cost_logs`   | ✅        |
| Google       | ✅ `api_usage_events` (serpapi/gemini) | ✅ Pricing | ❌ kein Modul-Finance-HUD | Events                    | teilweise |
| Digital Leak | ✅ dehashed (+ gemini)                 | ✅ Pricing | ❌                        | `api_usage_logs` + Events | teilweise |

Parity-Lücke: Nur Username besitzt den geforderten Finanzblock (Gewinnaufschlag, Mindestgewinn, Auto-Kalkulation).

---

## 8. DATENBANK

### Stärken

- Migrationen `001`–`023` decken Schema ab (47 Tabellen in Schema ≈ Migrationen).
- Username-/Leak-Tabellen mit FKs/Indizes.
- Runtime-Ensure für kritische Catalog-/Schema-Heals.

### Schwächen

- Legacy ungenutzt / kaum verdrahtet: `analysis_reports`, `analysis_report_items`, `subscription_plans`, `subscriptions`.
- Parallele Usage-Logs: `api_usage_events` + `api_usage_logs`.
- `password_reset` Token-Typ ohne Produktflow.
- Catalog-Self-Heal kann Admin-Absicht (`is_active=0`) überschreiben.

---

## 9. BENUTZERFLUSS

```
Registrierung → E-Mail-Verifizierung → Login → Dashboard
→ AnalyseCenter → ConsumeConfirm → ErgebnisCenter (scan=1)
→ Dashboard → Logout
```

| Übergang                    | Bewertung                           |
| --------------------------- | ----------------------------------- |
| Register → Verify → Login   | ✅                                  |
| Login → Dashboard           | ✅ (Query `from=` wird ignoriert)   |
| Analyse → Credits → Results | ✅ UI-Pfad                          |
| Results ohne Credits (API)  | ❌ umgehbar                         |
| Passwort vergessen          | ❌ Sackgasse (Feature fehlt)        |
| `/verification-expired`     | ⚠️ Seite orphaned (Inline-Handling) |

---

## 10. ROLLEN

| Rolle         | Umsetzung                                             |
| ------------- | ----------------------------------------------------- |
| Gast          | Public Pages/Forms; Middleware schützt Platform/Admin |
| Benutzer      | Session + DB; keine Admin-APIs                        |
| Administrator | Middleware JWT-Role + `getAdminAccess` auf APIs       |

**Lücke:** Admin-**Seiten** vertrauen JWT-Role (bis 8h); nach Role-Demotion können Pages kurz sichtbar bleiben, APIs korrekt 403.

Nur Rollen `admin` | `user` — kein separates „Gast“-Rollenobjekt (korrekt als unauthenticated).

---

## 11. SYNCREDITS

| Check                            | Ergebnis                                                |
| -------------------------------- | ------------------------------------------------------- |
| UI-Abbuchung vor Scan            | ✅ `ConsumeConfirm`                                     |
| Serverseitige Pflicht vor Run    | ❌ fehlt                                                |
| Negative Balances                | ✅ atomar verhindert                                    |
| Doppelbuchung                    | ⚠️ `requestId` ohne Idempotenz-Enforce                  |
| Charge ohne erfolgreiche Analyse | ⚠️ kein Refund                                          |
| Instant-Checkout Default         | ⚠️ `CREDITS_CHECKOUT_MODE=instant` möglich ohne Payment |
| `person_search` Consume          | ⚠️ Abbuchung ohne Analyse                               |

---

## 12. PROMOTIONEN

| Feature                     | Status                      |
| --------------------------- | --------------------------- |
| Auto-Bonus neue Benutzer    | ✅ bei Verify / Auto-Verify |
| Existing-User-Only Aktionen | ❌ kein Grant-Hook          |
| Promo-Code Redeem           | ❌ kein User-API/UI         |
| Historie / Logs             | ✅                          |
| Dashboard-Banner            | ✅ `PromotionWelcomeBanner` |

---

## 13. CODEQUALITÄT — Beobachtungen

- 15 Katalog-Keys, davon **3** end-to-end ausführbar.
- `alias_analysis` aktiv im Default-Seed, konzeptionell durch Username ersetzt, aber nicht auto-deaktiviert.
- `phone_analysis` / `email_analysis` in Admin/Profil-Readiness noch sichtbar trotz Replace.
- Demo-Daten in Threats / Teilen Results.
- Dual Source of Truth Username: `analysis_pricing` vs `username_module_settings`.
- Unbenutzte Legacy-Tabellen (Reports/Subscriptions).

---

## 14. PERFORMANCE

| Thema          | Befund                                                  |
| -------------- | ------------------------------------------------------- |
| SerpAPI        | Cache vorhanden (Google/Username); Concurrency begrenzt |
| Catalog Ensure | häufiger DB-Heal bei Pricing-Reads (TTL vorhanden)      |
| Rate-Limit     | in-memory → multi-instance schwach                      |
| Bundle         | ErgebnisCenter lädt große Report-Clients (akzeptabel)   |
| Unnötige Runs  | möglich ohne Credits (kosten + Latenz)                  |

---

## 15. SICHERHEIT

| Kontrolle                                 | Status            |
| ----------------------------------------- | ----------------- |
| Sessions (httpOnly, SameSite, DB revoke)  | ✅                |
| CSRF Origin/Sec-Fetch                     | ✅ auf Mutationen |
| Passwort Argon2id + Lockout               | ✅                |
| Admin-API-Rechte                          | ✅ DB-Role        |
| Upload (MIME, Magic, AES-GCM, Path-Guard) | ✅                |
| Formulare (Honeypot, RL)                  | ✅                |
| Analyse-Billing-Bypass                    | ❌ kritisch       |
| Distributed Rate-Limit                    | ⚠️ fehlt          |
| Passwort-Reset                            | ❌ fehlt          |
| Stale Admin-JWT Pages                     | ⚠️ mittel         |

---

## 16. FEHLERLISTE (priorisiert)

### Blocker

#### B-01 — Analyse-Run ohne serverseitige SynCredits-Prüfung

- **Modul:** Google / Digital Leak / Username
- **Ursache:** `POST /api/analysis/*/run` prüft Auth+CSRF, nicht Consume/Balance
- **Auswirkung:** Kostenlose API-Nutzung (SerpAPI/Gemini/DeHashed), Umsatzverlust
- **Lösung:** Server-Gate: gültige Consume-Transaktion / Reservierung vor Run; Idempotenz-Key
- **Aufwand:** mittel (Shared Guard + Tests)

#### B-02 — Digital Leak lässt sich nicht dauerhaft deaktivieren

- **Modul:** Digital Leak & Admin Catalog
- **Ursache:** `ensureDigitalLeakCatalog` setzt `is_active = 1`
- **Auswirkung:** Admin-Absicht wirkungslos; Modul bleibt sichtbar/aktiv
- **Lösung:** Ensure nur upserten ohne Force-Activate; Active-Flag respektieren
- **Aufwand:** klein–mittel

#### B-03 — Public-Catalog injiziert inaktive Module (Leak/Username)

- **Modul:** AnalyseCenter / ErgebnisCenter / CreditsPanel
- **Ursache:** `normalizePublicAnalyses` appendet Defaults wenn Key fehlt
- **Auswirkung:** Deaktivierte Module erscheinen weiter in der UI
- **Lösung:** Injection entfernen oder nur bei echter DB-Abwesenheit _und_ Default-Active; nie gegen explizites `is_active=0`
- **Aufwand:** klein–mittel

### Hoch

#### H-01 — Google/Leak-Run ignoriert `analysis_pricing.is_active`

- **Modul:** Google, Digital Leak
- **Ursache:** kein Pricing-/Modul-Gate vor Provider-Calls
- **Auswirkung:** API-Calls trotz Deaktivierung
- **Lösung:** gemeinsamer `assertAnalysisRunnable(key)` vor Run
- **Aufwand:** klein

#### H-02 — Dashboard ohne Username Intelligence

- **Modul:** Dashboard
- **Ursache:** `buildDashboardOverview` nur Google+Leak
- **Auswirkung:** KPIs/Risiken/Historie unvollständig
- **Lösung:** Username-Report laden und in Overview-Metriken mappen
- **Aufwand:** mittel

#### H-03 — Passwort-Reset nicht implementiert

- **Modul:** Auth
- **Ursache:** nur Schema/Zod, keine Routes/UI/Service
- **Auswirkung:** Benutzer können Passwort nicht zurücksetzen
- **Lösung:** Request-/Confirm-Flow inkl. Mail + Token
- **Aufwand:** mittel

#### H-04 — SynCredits-Consume nicht idempotent

- **Modul:** SynCredits
- **Ursache:** `requestId` wird geloggt, nicht unique enforced
- **Auswirkung:** Doppelabbuchung bei Retry
- **Lösung:** Unique Constraint / Lookup vor Debit
- **Aufwand:** klein–mittel

#### H-05 — Instant-Checkout ohne Payment in Prod möglich

- **Modul:** SynCredits Purchase
- **Ursache:** `CREDITS_CHECKOUT_MODE=instant`
- **Auswirkung:** Guthaben ohne Zahlung
- **Lösung:** Prod-Default auf Payment-Provider; Instant nur Dev
- **Aufwand:** klein

#### H-06 — Results FALLBACK zeigt Module als available

- **Modul:** ErgebnisCenter
- **Ursache:** Hardcoded FALLBACK_TABS
- **Auswirkung:** UI zeigt Analysen trotz Catalog-Ausfall/Inaktiv
- **Lösung:** FALLBACK leer oder `available:false`; nie hard available
- **Aufwand:** klein

### Mittel

#### M-01 — Google/Leak ohne Username-paritäres Finanz-HUD

- **Aufwand:** mittel

#### M-02 — Profil-Readiness nicht catalog-gefiltert; Username-Card fehlt in UI

- **Aufwand:** klein

#### M-03 — `person_search` ConsumeConfirm ohne Analyse

- **Aufwand:** klein (entfernen oder verdrahten)

#### M-04 — Promotion Existing-User / Promo-Code unvollständig

- **Aufwand:** mittel

#### M-05 — Login ignoriert `?from=` Redirect

- **Aufwand:** klein

#### M-06 — Stale Admin-JWT für Admin-Pages

- **Aufwand:** klein (DB-Role auch in Middleware/Layout)

#### M-07 — `alias_analysis` bleibt default-aktiv ohne Run-Pipeline

- **Aufwand:** klein (deaktivieren / durch Username ersetzen)

#### M-08 — Google-Analyse ruft DeHashed ohne Leak-Modul-Gate

- **Aufwand:** klein

#### M-09 — In-Memory Rate-Limits

- **Aufwand:** mittel (Redis/shared store)

#### M-10 — Admin-Toggle setzt `sortOrder: row.id`

- **Aufwand:** klein

#### M-11 — Threats Center Demo-Daten

- **Aufwand:** mittel

#### M-12 — Dual Gate Username (pricing vs module_settings)

- **Aufwand:** klein (Single Source of Truth)

### Niedrig

#### N-01 — `/verification-expired` orphaned

#### N-02 — Passwort-Guidance „8“ vs Schema „12“

#### N-03 — Legacy-Tabellen `analysis_reports` / `subscriptions` ungenutzt

#### N-04 — Doppelter Admin-Nav-Eintrag Username Finance → gleiche View

---

## 17. INVENTARLISTEN

### Analysemodule (Catalog Keys)

`google_search`, `digital_leak_exposure`, `username_intelligence`, `phone_analysis`, `website_analysis`, `domain_analysis`, `email_analysis`, `alias_analysis`, `social_media`, `person_search`, `reverse_image_search`, `ai_summary`, `pdf_report`, `deep_intelligence`, `full_identity_analysis`

### Ausführbare Analysemodule

`google_search`, `digital_leak_exposure`, `username_intelligence`

### Aktivier-/Deaktivierbar (Pricing `is_active`)

Alle 15 Catalog-Keys — **effektive** Deaktivierung derzeit nur für Keys ohne Force-Inject/Ensure zuverlässig (praktisch: Google und Platzhalter; Leak/Username problematisch).

### Datenbanktabellen (47)

`users`, `profiles`, `profile_aliases`, `profile_phone_numbers`, `profile_additional_emails`, `social_accounts`, `digital_traces`, `profile_images`, `sessions`, `user_tokens`, `security_profiles`, `analysis_reports`, `analysis_report_items`, `subscription_plans`, `subscriptions`, `payment_providers`, `credit_packages`, `analysis_pricing`, `credit_accounts`, `credit_transactions`, `invoices`, `usage_logs`, `payments`, `user_settings`, `promotions`, `promotion_rewards`, `promotion_logs`, `audit_events`, `communication_settings`, `contact_requests`, `partner_requests`, `press_requests`, `platform_settings`, `api_credentials`, `intelligence_reports`, `search_provider_settings`, `api_cost_settings`, `api_usage_events`, `digital_exposure_scans`, `digital_exposure_results`, `api_usage_logs`, `username_analysis`, `username_hits`, `username_reports`, `username_ai_reports`, `username_cost_logs`, `username_module_settings`

### APIs (Auswahl gruppiert)

- Auth: `/api/auth/{register,login,logout,session,verify-email,resend-verification}`
- Analysis: `/api/analysis/{google,digital-exposure,username}/{run,latest}`
- Credits: `/api/credits`, `packages`, `quote`, `consume`, `purchase`, `history`
- Identity/Onboarding/User: `/api/identity*`, `/api/onboarding*`, `/api/user/profile`
- Public: `/api/contact`, `/api/press`, `/api/partners`, `/api/pricing`, `/api/health`, `/api/security/status`, `/api/promotions/notifications`
- Admin: dashboard, system, audit, users*, credits add/remove, pricing, packages, promotions, communications*, platform-settings, api-credentials, search-provider*, finance/*, username-module

### Adminfunktionen (Navigation)

Benutzer (Übersicht, Verwaltung, SynCredits, Audit, Gesperrt, Profil) · Marketing (Preise, Promotionen) · Website (Systemstatus, Analysemodule, APIs, Bilder) · Finanzen (Übersicht, Zahlungsanbieter, API-Ausgaben, Username Intelligence) · Support (Nachrichten, Benutzersuche, Aktivitäten)

### Benutzerfunktionen

Registrierung, Verifizierung, Login/Logout, Onboarding, Dashboard, AnalyseCenter, Analyse-Startseiten, ErgebnisCenter, Profil/Identity inkl. Bilder, Settings, SynCredits kaufen/historie, Promotion-Banner, Threats (Demo), Mobile Upload, Company/Contact/Partners/Press, Legal/Status/Changelog

### Dashboard-Komponenten

`DashboardShell`, `DashboardSidebar`, `DashboardSectionHeader`, `DashboardPageRail`, `CreditsPanel`, `SecurityPanel`, `RecommendationsPanel`, `RiskCard`, `StatusCard`, `AnalysisWidget`, `PromotionWelcomeBanner`, `LogoutButton`, `AnalysisCenter`, `AnalysisTypeCard`, Results-*, `ThreatsCenter` · Lib: `build-dashboard-overview`, `resolve-active-analyses`, `analysis-center-data`, `page-rails`, Demo-Daten

### ENV-Variablen (referenziert)

`ALLOW_DEV_AUTH`, `ALLOW_PUBLIC_REGISTRATION`, `APP_URL`, `AUTO_VERIFY_EMAIL`, `CI`, `CONTACT_EMAIL`, `COOKIE_SECURE`, `CREDITS_CHECKOUT_MODE`, `CREDITS_PAYMENT_PROVIDER`, `CSRF_STRICT`, `DATABASE_URL`, `DEHASHED_API_KEY`, `DEHASHED_API_TOKEN`, `EMAIL_DELIVERY_MODE`, `FORCE_HTTPS`, `GEMINI_API_KEY`, `IMAGE_ENCRYPTION_KEY`, `NEXT_RUNTIME`, `NODE_ENV`, `PARTNER_EMAIL`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_REUSE`, `PRESS_EMAIL`, `PRIVATE_STORAGE_ROOT`, `REQUIRE_DATABASE`, `SERPAPI_API_KEY`, `SESSION_SECRET`, `SMTP_FORCE_IPV4`, `SMTP_FROM`, `SMTP_HOST`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`

### Services (`src/lib/services`)

`admin-dashboard-service`, `admin-platform-service`, `admin-service`, `admin-user-profile-service`, `api-credentials-service`, `auth-service`, `communications-service`, `credits-service`, `email-service`, `finance-service`, `identity-service`, `mobile-image-upload-service`, `onboarding-service`, `pricing-service`, `profile-service`, `promotions-service`, `search-provider-service`, `security-service`, `user-service`, `verification-service`

### Repositories

Interfaces + MySQL: admin, audit, communications, credits, identity, onboarding, pricing, profile, promotions, security, session, user, user-token (+ `index`, `profile-field-utils`)

---

## 18. OFFENE BAUSTELLEN (Freigabe-kritisch zuerst)

1. Serverseitiges SynCredits-Gate für alle Analyse-Runs
2. Catalog-Ensure/Injection so ändern, dass Admin-Deaktivierung global greift
3. Run-APIs an Modul-Aktivität koppeln
4. Dashboard um Username (und generisch um aktive Module) erweitern
5. Passwort-Reset fertigstellen
6. Consume-Idempotenz + Refund-/Failure-Policy
7. Finanz-Parity Google/Leak
8. Promo Existing-User / Code-Redeem oder Scope klar „nicht freigegeben“
9. Legacy-Module (`alias_analysis`, phone/email UI-Reste) bereinigen
10. Threats von Demo auf Live-Daten

---

## 19. OPTIMIERUNGSMÖGLICHKEITEN (nicht Freigabe-Blocker)

- Shared `assertAnalysisRunnable` für alle zukünftigen Module
- Redis Rate-Limit / Cache
- Einheitliche Cost-Log-Tabelle statt Events+Logs
- Dashboard-Adapter-Registry statt hardcodierter Google/Leak-Inputs
- Entfernen ungenutzter Subscription-/Legacy-Report-Tabellen oder verdrahten
- Bundle-Splitting großer Report-Views

---

## 20. EMPFOHLENE REIHENFOLGE DER BEHEBUNG

1. **B-01** SynCredits-Server-Gate
2. **B-02 + B-03** Deaktivierung echt machen
3. **H-01 + H-06** Run/FALLBACK Sichtbarkeit
4. **H-02** Dashboard Username
5. **H-03 / H-04 / H-05** Auth/Credits Härte
6. Mittel-Prioritäten nach Produktentscheid

---

## 21. FREIGABEENTSCHEIDUNG

| Frage                                | Antwort                                |
| ------------------------------------ | -------------------------------------- |
| Feature-Vollständigkeit Kernanalysen | hoch                                   |
| Admin-/Finance-Integration           | mittel (Username stark, Rest ungleich) |
| Deaktivierungsversprechen            | **nicht erfüllt**                      |
| Billing-Integrität                   | **nicht erfüllt**                      |
| **Go-Live empfohlen?**               | **Nein** — zuerst Blocker B-01…B-03    |

---

_Ende des Audits. Keine Code-Änderungen in diesem Schritt._
