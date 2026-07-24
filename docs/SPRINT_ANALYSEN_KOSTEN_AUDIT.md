# Audit-Report — Google Analyse & Digital Leak & Exposure

**Branch:** `cursor/digital-leak-exposure-7c12`  
**Datum:** 2026-07-24  
**Scope:** Datenabruf, API-Anfragen, SynCredits, Provider-Kosten

---

## Kurzfazit

| Analyse                     | SynCredits                | Provider-Kosten               | Status        |
| --------------------------- | ------------------------- | ----------------------------- | ------------- |
| **Google Suche**            | 2 (DB `analysis_pricing`) | SerpAPI + Gemini + DeHashed   | OK nach Fixes |
| **Digital Leak & Exposure** | 8                         | DeHashed (pro E-Mail/Telefon) | OK nach Fixes |

Beide Analysen starten über Confirm → Credits → Ergebniscenter-Scan.  
Admin-Kosteneinstellungen (`api_cost_settings`) greifen für SerpAPI, Gemini und DeHashed.

---

## 1. Google Analyse (`google_search`)

### Ablauf

1. Analyse Center → Google Karte → `/dashboard/analysis/google?start=1`
2. `ConsumeConfirm` bucht **2 SynCredits** (`POST /api/credits/consume`)
3. Redirect → `/dashboard/results?tab=google_search&scan=1`
4. `POST /api/analysis/google/run` → Report in `intelligence_reports`

### Welche Daten werden abgerufen?

| Quelle             | Was                                                 | Persistenz                                                             |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------------- |
| **SerpAPI Google** | Öffentliche Suchtreffer (Name, Alias, Location, …)  | Hits im Report                                                         |
| **SerpAPI Bing**   | Adult/Forum-Vektoren je Alias                       | Hits im Report                                                         |
| **DeHashed**       | 1 Leak-Suche (E-Mail OR Telefon OR Username)        | Hits als `dehashed_leak`; Klartext-Passwörter nur transient für Gemini |
| **Gemini**         | KI-Lagebild über verifizierte Treffer + Leak-Fakten | `aiSummary` Text                                                       |
| Profil             | Lokal verknüpfte Profil-Hinweise                    | Hits ohne HTTP                                                         |

### API-Anfragen pro Analyse

| Provider       | Typisch              | Maximum                |
| -------------- | -------------------- | ---------------------- |
| SerpAPI        | ca. 8–12             | **15** (`MAX_QUERIES`) |
| DeHashed       | 0–1                  | **1**                  |
| Gemini         | 1 erfolgreicher Call | bis 5 Modell-Versuche  |
| **Summe HTTP** | ca. 10–14            | ca. 21                 |

- Serp-Concurrency: 4 parallel
- Cache-Hits (1h In-Memory) zählen **nicht** als Serp-Kosten
- Einzelne Serp-/DeHashed-/Gemini-Fehler lassen den Report trotzdem fertigstellen

### SynCredits

- Key: `google_search`
- Default: **2**
- Abbuchung: vor dem Scan (UI)
- Admin kann Preis in Preisverwaltung ändern

### Provider-Kosten (Finanzen → API-Kosten)

| provider_code | billing_mode | Default                         | Verbuchung                                                                |
| ------------- | ------------ | ------------------------------- | ------------------------------------------------------------------------- |
| `serpapi`     | per_request  | **€0,023** / erfolgreiche Suche | 1 Event `google_analysis`, `requestCount` = erfolgreiche Non-Cache-Suchen |
| `gemini`      | per_token    | €1,38 / €6,90 je 1M Tokens      | Events `summarize*` inkl. **userId**                                      |
| `dehashed`    | per_request  | €0,00 (Admin-Override)          | 1 Event je Attempt (auch bei 0 Hits)                                      |

---

## 2. Digital Leak & Exposure (`digital_leak_exposure`)

### Ablauf

1. Analyse Center → Digital Leak Karte → `/dashboard/analysis/digital-exposure?start=1`
2. `ConsumeConfirm` bucht **8 SynCredits**
3. Redirect → `/dashboard/results?tab=digital_leak_exposure&scan=1`
4. `POST /api/analysis/digital-exposure/run` → Tabellen `digital_exposure_scans` / `_results`

### Welche Daten werden abgerufen?

| Quelle              | Was                                        | Persistenz                                           |
| ------------------- | ------------------------------------------ | ---------------------------------------------------- |
| **DeHashed v2**     | `POST /v2/search` je E-Mail und je Telefon | Findings inkl. Breach-Namen, Maskierung, DataClasses |
| Passwörter / Hashes | nur Presence-Flags                         | **niemals** Klartext gespeichert                     |

Query-Beispiele: `email:"a@b.de"`, `phone:"+4917…"`  
Auth: Header `DeHashed-Api-Key` (Account-E-Mail nur Admin-Referenz)

### API-Anfragen pro Analyse

| Provider | Anzahl                                                               |
| -------- | -------------------------------------------------------------------- |
| DeHashed | **1 × Anzahl eindeutiger E-Mails + 1 × Anzahl eindeutiger Telefone** |

Beispiel Profil mit 2 E-Mails + 1 Telefon → **3** DeHashed-Requests (+ 400 ms Pause dazwischen).

### SynCredits

- Key: `digital_leak_exposure`
- Default: **8**
- Ersetzt `phone_analysis` / `email_analysis` (inaktiv)

### Provider-Kosten

| provider_code | Event-Typen                    | Default                             |
| ------------- | ------------------------------ | ----------------------------------- |
| `dehashed`    | `search_email`, `search_phone` | €0,00 / Request (Admin setzt Preis) |

Jeder Call (Erfolg/Fehler) → `api_usage_events` + `api_usage_logs`.  
Finanzen-UI zeigt Provider `dehashed`.

### Behobene Bugs (dieser Sprint)

1. **insertId** falsch gelesen → Scan-500 trotz grünem Admin-Test
2. Results-SSR fail-safe (SYSTEMFEHLER)
3. Katalog-Ensure (Digital Leak sichtbar, Telefon/E-Mail weg)
4. DeHashed-Kosten in Google-Pipeline auch bei 0 Hits
5. Gemini-Kosten mit `userId`

---

## 3. Vergleich

|                 | Google                            | Digital Leak           |
| --------------- | --------------------------------- | ---------------------- |
| SynCredits      | 2                                 | 8                      |
| Haupt-Provider  | SerpAPI + Gemini (+ DeHashed)     | nur DeHashed           |
| Requests        | bis 15 Serp + 1 DeHashed + Gemini | N E-Mails + M Telefone |
| Report-Speicher | `intelligence_reports`            | `digital_exposure_*`   |
| Kosten-Admin    | serpapi, gemini, dehashed         | dehashed               |

---

## 4. Bekannte Einschränkungen (kein Blocker)

1. Run-APIs prüfen Credits nicht erneut serverseitig (Abbuchung nur im Confirm-UI).
2. Bei Scan-Fehler nach Confirm: kein automatisches Credit-Refund.
3. DeHashed-Stückpreis default €0 — Admin sollte realen Preis setzen.
4. Admin-API-Test erzeugt kein Finance-Event.

---

## 5. Deploy

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/digital-leak-exposure-7c12
git pull origin cursor/digital-leak-exposure-7c12
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:ensure-catalog
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```

### Nach Deploy prüfen

1. Admin → APIs: Gemini, SerpAPI/Search, DeHashed **API TESTEN** grün
2. Admin → Finanzen → API-Kosten: `serpapi`, `gemini`, `dehashed` vorhanden; Preise setzen
3. Admin → Preisverwaltung: Google = 2, Digital Leak = 8; Telefon/E-Mail inaktiv
4. Google-Analyse einmal laufen lassen → SynCredits −2, Events unter Finanzen
5. Digital Leak einmal laufen lassen → SynCredits −8, DeHashed-Events, Status `completed`
