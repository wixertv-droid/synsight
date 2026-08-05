# Abschlussbericht — Admin-Modul „SEO & Wissensdatenbank“

**Branch:** `cursor/admin-seo-knowledge-cms-7c12`  
**Build:** `npm run build` erfolgreich  
**Tests:** Navigation + In-Memory-CRUD grün

## Ziel

Vollständige Admin-Verwaltung öffentlicher Wissens-/SEO-Seiten, ohne bestehende
Module zu verändern. Inhalte kommen aus der Datenbank; öffentliche Seiten unter
`/wissen/[slug]` werden automatisch aus dem Template gerendert.

## Neue Datenbanktabellen (Migration `039_seo_knowledge_cms.sql`)

| Tabelle                  | Zweck                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `seo_knowledge_pages`    | Stammdaten, SEO, Hero, CTA, Status, Soft-Delete, Automation-Flags                        |
| `seo_knowledge_sections` | Beliebige Inhaltsabschnitte inkl. Typ (content/infobox/hint/code/table/list), sortierbar |
| `seo_knowledge_faqs`     | FAQ für JSON-LD                                                                          |
| `seo_knowledge_links`    | Interne Verlinkung (wissen/analyse/landing/module)                                       |

Bestehende Tabellen wurden **nicht** geändert.

## Neue API-Endpunkte

| Methode | Pfad                                           | Funktion                        |
| ------- | ---------------------------------------------- | ------------------------------- |
| GET     | `/api/admin/seo/knowledge`                     | Liste + Filter/Suche/Sortierung |
| POST    | `/api/admin/seo/knowledge`                     | Seite anlegen                   |
| GET     | `/api/admin/seo/knowledge/[id]`                | Detail inkl. Sections/FAQ/Links |
| PATCH   | `/api/admin/seo/knowledge/[id]`                | Aktualisieren                   |
| PATCH   | `/api/admin/seo/knowledge/[id]?action=restore` | Aus Papierkorb                  |
| DELETE  | `/api/admin/seo/knowledge/[id]`                | Soft-Delete                     |
| DELETE  | `/api/admin/seo/knowledge/[id]?hard=1`         | Endgültig löschen               |
| POST    | `/api/admin/seo/knowledge/[id]/duplicate`      | Duplizieren als Entwurf         |

## Admin-UI

- Neuer Hauptmenüpunkt **A6 SEO & Wissensdatenbank**
- `/admin/seo/uebersicht` — Liste, Filter, CRUD, Vorschau, Duplizieren
- `/admin/seo/papierkorb` — Wiederherstellen / endgültig löschen
- Abschnitte per Drag & Drop sortierbar
- Status: Entwurf / Veröffentlicht / Archiviert

## Öffentliche Seitengenerierung

| Route                      | Verhalten                                 |
| -------------------------- | ----------------------------------------- |
| `/wissen`                  | Index veröffentlichter Seiten             |
| `/wissen/[slug]`           | Nur `published`                           |
| `/wissen/[slug]?preview=1` | Admin-Vorschau (auch Entwurf)             |
| `sitemap.xml`              | Enthält `/wissen` + veröffentlichte Slugs |

## Neu angelegte Dateien (Auswahl)

- `database/migrations/039_seo_knowledge_cms.sql`
- `src/lib/repositories/seo-knowledge-repository.ts`
- `src/lib/repositories/mysql/seo-knowledge-repository.ts`
- `src/lib/services/seo-knowledge-service.ts`
- `src/lib/validation/admin-seo-knowledge.ts`
- `src/app/api/admin/seo/knowledge/route.ts`
- `src/app/api/admin/seo/knowledge/[id]/route.ts`
- `src/app/api/admin/seo/knowledge/[id]/duplicate/route.ts`
- `src/components/admin/AdminSeoKnowledgeControl.tsx`
- `src/app/(seo)/wissen/page.tsx`
- `src/app/(seo)/wissen/[slug]/page.tsx`
- `tests/unit/services/seo-knowledge-repository.test.ts`
- `docs/seo-knowledge-cms-report.md` (dieser Bericht)
- `docs/seo-knowledge-base.md` (aktualisiert)

## Geänderte Dateien (Auswahl)

- `src/lib/database/schema.ts` — additive Tabellen
- `src/lib/repositories/index.ts` — `getSeoKnowledgeRepository`
- `src/lib/admin/navigation.ts` — Section `seo` / A6
- `src/components/admin/views/AdminViewHost.tsx` — Views verdrahtet
- `src/app/sitemap.ts` — Wissensseiten
- `tests/unit/admin/navigation.test.ts`

## Getestete Funktionen

- [x] Typecheck / Production Build
- [x] Unit: Navigation A6
- [x] Unit: In-Memory CRUD, Soft-Delete, Restore, Duplicate, Publish-Slug
- [ ] Live-MariaDB-Migration auf VPS (nach Deploy: `npm run db:migrate`)
- [ ] Manueller Admin-Klickpfad auf Produktion

## Deploy (VPS `/opt/synsight`)

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/admin-seo-knowledge-cms-7c12
git pull origin cursor/admin-seo-knowledge-cms-7c12
npm ci

DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:ensure-catalog
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:status
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build

pm2 delete synsight 2>/dev/null || true
pm2 start ecosystem.config.cjs --update-env
pm2 save
```

Contabo Deep-API: **kein** Update nötig.

## Offene Punkte (später)

- WYSIWYG statt Textarea/Markdown
- Bild-Upload in Media-Library statt URL-Felder
- Automatische interne Verlinkungsvorschläge
- RSS-Feed, Mehrsprachigkeits-Workflow, AI-Content-Assist
- Optionaler Import der Legacy-Datei `src/data/seoKnowledgeBase.ts`
- `@dnd-kit` für feinere Drag-UX (aktuell HTML5 DnD + Pfeile)
