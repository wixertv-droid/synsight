# Identitätsprofil Persistenz — Abschlussbericht

## Problem

Frühere Wohnorte (`previous_locations`) und teilweise weitere Angaben wirkten
„nicht gespeichert“: Speichern in der DB klappte, beim **Lesen** gingen die
Werte verloren. Dadurch waren sie weder in der UI nach Reload sichtbar noch in
der OSINT-Suche.

## Ursache (kritisch)

`profiles.previous_locations` ist JSON. MariaDB liefert JSON oft als **String**.
`mapProfile` prüfte nur `Array.isArray(...)` → sonst immer `[]`.

## Behobene Punkte

| Thema              | Fix                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| Frühere Wohnorte   | `parseJsonStringArray` in MySQL `mapProfile` (Identity + Profile)   |
| Geburtsdatum       | `normalizeBirthDate` (DATE/ISO → `YYYY-MM-DD`)                      |
| Onboarding-Wohnort | `city` → `profiles.location` (nicht mehr nur `region`)              |
| Fingerprint        | `previousLocations` + `companies` in Matrix/Hash                    |
| Suche              | Location-Vektor nutzt aktuelle + frühere Wohnorte                   |
| Bilder             | Identity-Save löscht/überschreibt keine Profilbilder mehr           |
| Public Profiles    | `digital_traces.public_profile` bleiben beim Identity-Save erhalten |

## Datenbank-Mapping (Kurz)

| Feld               | Tabelle/Spalte                                        |
| ------------------ | ----------------------------------------------------- |
| Wohnort            | `profiles.location`                                   |
| Frühere Wohnorte   | `profiles.previous_locations` (JSON)                  |
| Adresse            | `profiles.address_line`                               |
| Firma              | `profiles.company` + `digital_traces` (`company`)     |
| Benutzernamen      | `profile_aliases` (`username`)                        |
| E-Mails / Telefone | `profile_additional_emails` / `profile_phone_numbers` |
| Websites/Domains   | `digital_traces`                                      |

## Suchhistorie zurücksetzen

Script: `database/scripts/reset_search_history.sql`

Löscht u. a. `intelligence_reports`, Legacy-Reports und Analyse-`api_usage_events`,
damit die nächste Google-Analyse wie ein frischer Start („Suche 1“) wirkt.
Danach **pm2 restart** (In-Memory-Caches).

## Geänderte Dateien (Auswahl)

- `src/lib/repositories/profile-field-utils.ts` (neu)
- `src/lib/repositories/mysql/identity-repository.ts`
- `src/lib/repositories/mysql/profile-repository.ts`
- `src/lib/repositories/mysql/onboarding-repository.ts`
- `src/lib/repositories/identity-repository.ts`
- `src/lib/repositories/onboarding-repository.ts`
- `src/lib/analysis/osint/identity-fingerprint.ts`
- `src/lib/analysis/osint/search-planner.ts`
- `database/scripts/reset_search_history.sql` (neu)
- `docs/IDENTITY_PERSISTENCE_REPORT.md` (diese Datei)
