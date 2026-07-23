# SynSight Landing Page

Futuristische Landing Page für **SynSight** — eine KI-basierte Plattform zur Analyse und zum Schutz der digitalen Identität.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 3**

## Features

- System-Start / Loading Screen mit HUD-Animationen
- Hero Section mit Canvas-basierter Datenwelt
- Scroll-animierte Sektionen für digitale Spuren
- Premium Feature Cards
- Interaktiver KI-Scanner Demo
- Vertrauensbereich & professioneller Footer
- Responsive Design mit Glassmorphism & Glow-Effekten

## Entwicklung

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## SerpAPI (Suchanbieter)

SynSight nutzt **SerpAPI** für Live-Google-Suchergebnisse in der Google-Analyse.
Die frühere Google Custom Search JSON API wurde entfernt.

### API-Key hinterlegen

1. Admin → **Website** → **APIs & Integrationen**
2. Bereich **Suchanbieter (Search Provider)**
3. Provider: `SerpAPI (Standard)`
4. SerpAPI-Key eintragen → **API Key speichern**

Der Key wird AES-256-GCM verschlüsselt in `search_provider_settings` gespeichert und
nie im Klartext im Frontend angezeigt. Optionaler Env-Fallback: `SERPAPI_API_KEY`.

### Testfunktion

Button **API Verbindung testen** sendet eine echte Probe-Suche (z. B. „SynSight“) an SerpAPI.
Bei Erfolg erscheint eine Statuskarte mit Provider, Google Search Online, Antwortzeit und API-Version.

Route: `POST /api/admin/search-provider/test` (nur Administratoren).

### Provider wechseln

Das Dropdown ist auf SerpAPI aktiv. Architektur und Tabelle sind multi-provider-fähig
(DataForSEO, Bing Search, Custom Provider — Sprint 6B+).

### Architektur

```
Google Analyse → SearchProvider Interface → SerpApiProvider → SerpAPI
Admin UI       → /api/admin/search-provider → search-provider-service
```

Keine SerpAPI-Logik in React-Komponenten; keine Reste der Google Custom Search JSON API.

## Projektstruktur

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── hero/
│   ├── layout/
│   ├── loading/
│   ├── sections/
│   └── ui/
├── lib/
│   ├── search/          # SearchProvider + SerpApiProvider
│   └── services/
└── hooks/
```
