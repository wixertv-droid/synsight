# Google Report Text — Abschlussbericht

**Branch:** `cursor/google-report-text-fix-7c12`  
**Basis:** `cursor/admin-finanzen-7c12`  
**Status:** Implementiert

## Behoben

1. **„Als Erstes tun“** — Text wurde mit `.slice(0, 28)` abgeschnitten
   (`Sensible Google-Treffer prüf .`). Jetzt vollständiger Titel, Empfehlung
   heißt klar **„Kritische Treffer prüfen“**.
2. **KI-Lagebild** — mehr Output-Tokens (4096), längerer Prompt (180–280 Wörter),
   Sanitizer kürzt nicht mehr aggressiv; Absätze bleiben erhalten.
3. **Analyse-Zusammenfassung** — in verständliche Kurzabschnitte umgeschrieben
   (Kurz gesagt → Was betrifft Sie → Risiko → Empfehlung).
4. **Abschnitts-Rail** — rechts wie auf der Startseite, Labels immer sichtbar,
   präzises Scroll-Tracking (`getBoundingClientRect` + rAF), Klick-Lock gegen
   Springen, schmalerer Report-Body (`max-w ~880–940px`) und sehr dezenter
   Matrix-Code nur in den Seiten-Gutters.

## Deploy

```bash
cd /opt/synsight
git fetch origin
git reset --hard origin/cursor/google-report-text-fix-7c12
rm -rf node_modules .next
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 restart ecosystem.config.cjs --update-env
```

Hinweis: Für ein frisches, vollständiges KI-Lagebild die Google-Analyse einmal
neu starten. Rail und Matrix-Hintergrund gelten sofort nach Deploy.
