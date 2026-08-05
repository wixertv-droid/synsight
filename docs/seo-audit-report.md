# SynSight SEO-Audit & Abschlussbericht

**Branch:** `cursor/seo-full-optimization-7c12`  
**Datum:** 2026-08-05  
**Scope:** Technische SEO, Structured Data, Performance-Hooks, Keyword-Landings, Indexierung, Social Preview, E-E-A-T, Security Headers — **ohne Änderung bestehender Produktfunktionen**.

---

## Scores (Heuristik / Implementierungsstand)

| Kategorie                       |        Score | Kommentar                                                                                                                                               |
| ------------------------------- | -----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEO gesamt**                  | **86 / 100** | Robots, Sitemap, Canonicals, Unique Titles, Schema, Landings vorhanden; Local NAP & EN-hreflang noch Vorbereitung                                       |
| **Performance**                 | **72 / 100** | Fonts swap, Image AVIF/WebP, Package-Import-Optimierung, Cache-Header; LaunchScreen + 3D-Globe belasten LCP weiterhin (funktionsbedingt nicht entfernt) |
| **Accessibility**               | **78 / 100** | Breadcrumbs, FAQ-Buttons mit aria-expanded, Favicon/Logo titles; weitere A11y-Pass nötig                                                                |
| **Best Practices**              | **88 / 100** | Security Headers, no poweredBy, noindex für App-Bereiche                                                                                                |
| **Core Web Vitals (Erwartung)** | **gemischt** | LCP: durch LaunchScreen/Globe eingeschränkt; CLS: weitgehend stabil; INP: SEO-Seiten leicht                                                             |

---

## Indexierungsmatrix

| Bereich                                                                     | Index | Follow |
| --------------------------------------------------------------------------- | ----- | ------ |
| `/`, `/analysen`, Tool-Landings, `/hilfe`, `/blog`, Legal                   | ja    | ja     |
| `/login`, `/register`, `/dashboard`, `/profile`, `/settings`, `/onboarding` | nein  | nein   |
| `/api/*`, Admin/Results (Policy vorbereitet)                                | nein  | nein   |

---

## Structured Data (JSON-LD)

Implementiert: Organization, WebSite (+ SearchAction), WebApplication, SoftwareApplication, Service, FAQPage, BreadcrumbList, Article/BlogPosting-Struktur.

---

## Keyword-Landingpages

`/google-analyse`, `/username-suche`, `/digital-footprint`, `/reverse-image-search`, `/email-check`, `/telefon-check`, `/social-media-analyse`, `/osint-analyse`, `/personensuche`, `/datenleck-pruefen`  
Hub: `/analysen` · Hilfe: `/hilfe` · Blog-Prep: `/blog` + 2 Artikel-Stubs  
Redirects: `/tools`→`/analysen`, `/osint`→`/osint-analyse`, `/leak-check`→`/datenleck-pruefen`, `/help`→`/hilfe`

---

## Geänderte / neue Dateien

### Neu — SEO Core

- `src/lib/seo/site.ts` — Site-/NAP-Config
- `src/lib/seo/metadata.ts` — Title, Description, Canonical, OG/Twitter Builder
- `src/lib/seo/schema.ts` — JSON-LD Generatoren
- `src/lib/seo/index-policy.ts` — Index/Noindex-Policy
- `src/lib/seo/tool-landings.ts` — 10 Tool-Seiten inkl. FAQ/Keywords
- `src/lib/seo/keywords.ts` — Keyword-Säulen + KI-zitierbare Fakten
- `src/lib/seo/sitemap-entries.ts` — Sitemap-Daten
- `src/lib/seo/blog.ts` — Blog-Stubs

### Neu — UI

- `src/components/seo/JsonLd.tsx`, `Breadcrumbs.tsx`, `FaqAccordion.tsx`, `PublicShell.tsx`, `ToolLandingView.tsx`

### Neu — Routes

- `src/app/robots.ts`, `sitemap.ts`, `manifest.ts`
- `src/app/opengraph-image.tsx`, `twitter-image.tsx`, `icon.tsx`, `apple-icon.tsx`
- `src/app/not-found.tsx`, `error.tsx`
- `src/app/(seo)/[tool]/page.tsx`, `analysen/`, `hilfe/`, `blog/`, `blog/[slug]/`

### Neu — Public/Docs

- `public/llms.txt` — KI-Suchmaschinen
- `public/favicon.svg`
- `docs/seo-local-nap.md` — Local SEO Vorbereitung

### Angepasst

- `src/app/layout.tsx` — metadataBase, OG/Twitter, Schema im Root
- `next.config.ts` — CSP, HSTS, Cache, Redirects, Image-Formate
- `Footer.tsx`, `Navbar.tsx` — interne Verlinkung
- `impressum/datenschutz/agb` — Unique Meta + Schema
- Auth/Platform/Onboarding Layouts — striktes noindex

---

## Fehlstellen / Backlog

### Blocker

- Keine (Build grün; öffentliche SEO-Basis live-fähig)

### Hoch

- Finale Impressums-/NAP-Adresse für Local SEO
- LCP der Startseite (LaunchScreen/Globe) gesondert performance-optimieren — **ohne** UX-Änderung nur begrenzt möglich
- Production-OG mit finalem Brand-Asset (Designer)

### Mittel

- `hreflang` en aktivieren, sobald EN-Inhalte existieren
- Blog-Redaktion mit echten Fachartikeln
- Bild-SEO für künftige Marketing-Fotos (WebP/AVIF + Alt)

### Niedrig

- Review-Schema wenn echte Kundenstimmen vorliegen
- Bing/Apple Places Profiles

---

## Deploy-Hinweis

```bash
cd /opt/synsight
git fetch origin && git checkout cursor/seo-full-optimization-7c12
git pull origin cursor/seo-full-optimization-7c12
npm run build && pm2 restart synsight --update-env
```

Danach in GSC/Bing: Sitemap `https://synsight.de/sitemap.xml` einreichen.  
Optional: `https://synsight.de/llms.txt` für KI-Crawler prüfen.
