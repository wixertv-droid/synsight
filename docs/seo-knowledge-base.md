# SynSight SEO Knowledge Base — CMS

## Quelle der Wahrheit

Ab Migration `039_seo_knowledge_cms.sql` werden öffentliche Wissensseiten
**über den Admin** verwaltet:

- Admin → **SEO & Wissensdatenbank** (`/admin/seo/uebersicht`)
- Öffentliche URLs: `/wissen` und `/wissen/[slug]`
- Nur Status **Veröffentlicht** ist öffentlich (außer Admin-Vorschau `?preview=1`)

Die Datei `src/data/seoKnowledgeBase.ts` bleibt als historische Content-Strategie
erhalten, wird aber **nicht** mehr für Live-Routen benötigt.

## Tabellen

- `seo_knowledge_pages`
- `seo_knowledge_sections`
- `seo_knowledge_faqs`
- `seo_knowledge_links`

## API

- `GET/POST /api/admin/seo/knowledge`
- `GET/PATCH/DELETE /api/admin/seo/knowledge/[id]`
- `POST /api/admin/seo/knowledge/[id]/duplicate`

## Später

Automatische interne Verlinkung, RSS, Mehrsprachigkeit-UI, AI-Assist —
Datenfelder (`automation_flags_json`, `language`) sind vorbereitet.
