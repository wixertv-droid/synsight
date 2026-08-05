# SynSight SEO Knowledge Base — Strategie

Datei: `src/data/seoKnowledgeBase.ts`

## Zweck

Zentrale TypeScript-Wissensdatenbank mit **100** Landingpage-Objekten.
Später nutzbar als:

- automatischer Landingpage-Generator
- interne Verlinkungsquelle
- Keyword-/Intent-Planung
- FAQ-/Schema-Feed

Noch **keine** automatischen Routen – nur Daten.

## Abdeckung

| Bereich | Beispiele |
|---------|-----------|
| Identität / Fußabdruck | digitaler-fussabdruck, online-reputation-pruefen |
| OSINT | osint-erklaerung, personensuche-im-internet |
| Datenlecks / Email | wurde-meine-email-gehackt, hibp-erklaerung |
| Benutzernamen | benutzername-suchen, username-analyse-synsight |
| Telefon | wem-gehoert-diese-nummer, telefon-check-synsight |
| Social Media | social-media-suche, fake-profil-erkennen-social |
| Reverse Image / Face | reverse-image-search-erklaerung, face-scan-synsight |
| Cybersecurity | phishing-erkennen, doxxing, passwortmanager |
| Datenschutz | dsgvo, suchmaschinen-loeschen |
| SynSight-Module | google-analyse-synsight, ki-risikoanalyse |

## Felder

Jedes Objekt enthält u. a. `slug`, `title`, `metaDescription`, `keywords`,
`category`, `difficulty`, `searchIntent`, `targetModule`,
`estimatedSearchVolume`, `seoPriority`, Hero/Intro/Sections/FAQ,
`relatedPages`, `internalLinks`, `callToAction`, `riskLevel`, `lastUpdated`.

## Nächster Schritt (Generator)

1. Route z. B. `app/(seo)/wissen/[slug]/page.tsx`
2. `getSeoKnowledgePage(slug)` laden
3. Metadata + FAQ JSON-LD aus Objekt erzeugen
4. `relatedPages` → interne Links
