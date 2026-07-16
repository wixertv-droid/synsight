# Sprint 5D Hotfix — Deployment Visual Parity Report

**Branch:** `cursor/sprint-5d-hotfix-deploy-7c12`  
**Datum:** 2026-07-16

---

## Ursache (nachgewiesen, keine Vermutung)

### Fehler

In `next.config.ts` wurden bei `NODE_ENV === "production"` immer gesetzt:

1. CSP-Direktive **`upgrade-insecure-requests`**
2. Header **`Strict-Transport-Security`**

`npm run build` setzt `NODE_ENV=production` immer. Die Header werden **zur Build-Zeit** in den Artifact gebacken.

### Nachweis

Production-Server über HTTP mit Hostname `synsight.local:3000` (Playwright/Chromium):

| Vor Fix                                                    | Nach Fix               |
| ---------------------------------------------------------- | ---------------------- |
| CSS/JS/Fonts → `https://…` → `net::ERR_SSL_PROTOCOL_ERROR` | Assets laden über HTTP |
| `body` Hintergrund `rgba(0,0,0,0)`                         | `rgb(3, 5, 10)`        |
| Font `Times New Roman`                                     | `Manrope, …`           |

`127.0.0.1` / `localhost` sind in Chromium von Upgrade ausgenommen — deshalb wirkte lokal „Production“ oft noch korrekt, der Server-Hostname aber nicht.

### Zweitrangiger verwandter Fehler

Session-Cookies nutzten `secure: NODE_ENV === "production"`. Über reines HTTP werden Secure-Cookies vom Browser verworfen → Login/Dashboard wirken „kaputt“.

---

## Was geprüft und OK war

- Kein `basePath` / `assetPrefix`
- `package.json` `build` / `start` korrekt
- CSS/JS/Fonts werden im Build erzeugt (`/_next/static/…`, `.woff2`)
- `globals.css` + Tailwind + PostCSS korrekt eingebunden
- Keine fehlerhaften localhost-Hardcodes in App-UI-Code
- Dynamische Imports (`ssr: false` für Globe) funktionsfähig (Canvas vorhanden)
- `APP_URL` wird für Verifizierung/CSRF genutzt (korrekt)

---

## Fixes

1. **`next.config.ts`** — `upgrade-insecure-requests` + HSTS nur wenn `APP_URL` mit `https://` beginnt oder `FORCE_HTTPS=true`
2. **`src/lib/security/https.ts`** — zentrale Helper
3. **`src/lib/auth/session.ts`** — `Secure`-Cookie nur bei HTTPS-Konfiguration
4. **`src/app/layout.tsx`** — `metadataBase` aus `APP_URL` (keine feste localhost-/Domain-Annahme für OG)
5. **`.env.production.example`** + **`ecosystem.config.cjs`** — Deploy-Hinweise

---

## Server-Anweisung

```bash
git fetch origin
git checkout cursor/sprint-5d-hotfix-deploy-7c12
git pull

# APP_URL = exakt die Origin, die Nutzer im Browser öffnen
# Ohne TLS:
export APP_URL=http://IHRE-IP-ODER-DOMAIN:3000
# Mit TLS:
# export APP_URL=https://synsight.de

npm ci
npm run build    # wichtig: nach APP_URL-Änderung neu bauen
pm2 restart synsight
# oder: pm2 start ecosystem.config.cjs
```

---

## Verifikation

- typecheck / lint / tests / build
- Production `npm run start`
- Browser-Test `http://synsight.local:3000` → Manrope + Cyber-Background, keine SSL-Asset-Fehler
