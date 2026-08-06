# Prio 1 Public Security Runbook

Dieses Runbook ist für den ersten öffentlichen SynSight-Hardening-Schritt gedacht. Es enthält absichtlich keine echten Secrets, IPs oder Provider-Zugangsdaten.

## Ziel

Vor Beta/öffentlichem Traffic müssen alle bereits in Chat, PR-Beschreibungen, Logs oder versehentlichen Commits sichtbaren Werte als kompromittiert behandelt werden.

## Sofort rotieren

Rotieren, auch wenn ein Wert später wieder gelöscht wurde:

- MariaDB-Passwort des SynSight-App-Users
- DemoScanner Bearer/API-Key
- `SESSION_SECRET`, falls jemals außerhalb des Servers sichtbar
- `IMAGE_ENCRYPTION_KEY`, falls jemals außerhalb des Servers sichtbar
- SMTP-Passwort
- SerpAPI-Key
- Gemini/OpenAI/sonstige Provider-Keys
- Alle Worker-/Scanner-Service-Keys

Nach Key-Rotation müssen verschlüsselte Admin-API-Credentials neu gespeichert werden, wenn sie nicht mehr entschlüsselbar sind.

## GitHub bereinigen

1. Offene PR-Bodies und Issue-Kommentare nach echten Secrets, IPs, Passwörtern und Deploy-Kommandos durchsuchen.
2. Sensible Werte durch Platzhalter ersetzen, zum Beispiel:
   - `DATABASE_URL=mysql://USER:***@HOST:3306/DB`
   - `DEMO_SCAN_API_URL=https://scanner.internal.example/api/scan`
   - `DEMO_SCAN_API_KEY=<ROTATED_SECRET>`
3. GitHub Secret Scanning prüfen und aktivieren.
4. Keine echten Werte in PR-Beschreibungen, README-Dateien, Prompts oder Screenshots schreiben.

## Server-Hardening DemoScanner

Der DemoScanner darf nicht direkt öffentlich aus dem Internet erreichbar sein.

Empfohlen:

```bash
# Beispielhaftes Prinzip, Werte an echte Server-IP/Interface anpassen.
# Erlaube Scanner-Port nur vom SynSight-Webserver.
sudo ufw deny 5000/tcp
sudo ufw allow from <SYNSIGHT_SERVER_PRIVATE_OR_PUBLIC_IP> to any port 5000 proto tcp
sudo ufw status verbose
```

Zusätzlich in Nginx/Proxy:

- App-Port 3000 nicht direkt öffentlich erreichbar lassen.
- Scanner-Port nicht öffentlich exposen.
- `X-Forwarded-For` nur aus vertrauenswürdigem Proxy setzen lassen.
- Für `/api/scan` zusätzlich Nginx-Rate-Limit aktivieren.

## Produktions-Env Pflichtwerte

In `.env.production` müssen echte Werte gesetzt sein. Beispiel nur mit Platzhaltern:

```env
NODE_ENV=production
REQUIRE_DATABASE=true
APP_URL=https://synsight.de
DATABASE_URL=mysql://USER:ROTATED_PASSWORD@127.0.0.1:3306/synsight
SESSION_SECRET=<ROTATED_32_PLUS_CHARS>
IMAGE_ENCRYPTION_KEY=<ROTATED_DIFFERENT_32_PLUS_CHARS>
ALLOW_DEV_AUTH=false
AUTO_VERIFY_EMAIL=false
EMAIL_DELIVERY_MODE=provider
SMTP_HOST=<SMTP_HOST>
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<SMTP_USER>
SMTP_PASS=<ROTATED_SMTP_PASSWORD>
SMTP_FROM=SynSight <noreply@synsight.de>
DEMO_SCAN_API_URL=<INTERNAL_SCANNER_URL>
DEMO_SCAN_API_KEY=<ROTATED_DEMOSCANNER_KEY>
```

## Deploy-Check

Nach Rotation und Deploy:

```bash
cd /opt/synsight
npm run db:migrate
npm run build
pm2 restart ecosystem.config.cjs --update-env
pm2 logs synsight --lines 80 --nostream
```

Browser-/API-Checks:

- Registrierung sendet keine Preview-Tokens im Browser.
- Passwort-Reset sendet keine Preview-Tokens im Browser.
- Provider-Mailmodus sendet echte Mails oder zeigt eine harmlose Fehlermeldung ohne Token-Link.
- `/api/scan` gibt 503, wenn Scanner-URL oder Key fehlen.
- DemoScanner-Test im Admin funktioniert erst mit frisch gespeichertem Key.

## Wichtig

Alte Secrets nie wiederverwenden. Wenn ein Wert in GitHub, Logs, Screenshots oder Chat sichtbar war, gilt er als öffentlich.
