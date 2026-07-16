# VPS: Registrierung / DATABASE_URL / SMTP — Fix-Anleitung

## Was die Logs bedeuten

| Log                                                                   | Bedeutung                                                            |
| --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `Access denied for user 'synsight'@'localhost' (using password: YES)` | PM2 nutzt ein falsches oder fehlendes `DATABASE_URL`-Passwort        |
| `[email:provider] Verification delivery failed …`                     | SMTP falsch / Port blockiert / Absender nicht bestätigt              |
| User steht in der DB, UI zeigt Fehler                                 | Früher: Env/SMTP-Crash **nach** dem Insert. Das ist im Code behoben. |

`env_file: ".env.production"` in PM2 **nicht** verwenden — viele PM2-Versionen ignorieren das. Die Repo-Datei `ecosystem.config.cjs` lädt `.env.production` selbst.

---

## 1. Code aktualisieren

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/auth-flow-stabilize-7c12
git pull origin cursor/auth-flow-stabilize-7c12
npm ci
```

---

## 2. MariaDB-Passwort prüfen (wichtig)

```bash
# Muss mit dem Passwort in .env.production übereinstimmen
mysql -u synsight -p -e "SELECT 1 AS ok; SHOW DATABASES LIKE 'synsight';"
```

Wenn Access denied:

```bash
sudo mysql -e "ALTER USER 'synsight'@'localhost' IDENTIFIED BY 'NEUES_STARKES_PASSWORT'; FLUSH PRIVILEGES;"
```

Dann dasselbe Passwort in `.env.production` eintragen.

---

## 3. `.env.production` korrekt setzen

```bash
nano /opt/synsight/.env.production
```

Mindestens:

```dotenv
NODE_ENV=production
REQUIRE_DATABASE=true
DATABASE_URL=mysql://synsight:NEUES_STARKES_PASSWORT@localhost:3306/synsight
SESSION_SECRET=mindestens_32_zufaellige_zeichen_hier
IMAGE_ENCRYPTION_KEY=anderer_mindestens_32_zeichen_schluessel
APP_URL=https://synsight.de

ALLOW_PUBLIC_REGISTRATION=true
AUTO_VERIFY_EMAIL=false
EMAIL_DELIVERY_MODE=provider
CSRF_STRICT=true
COOKIE_SECURE=true

SMTP_HOST=smtp.dein-anbieter.de
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dein-smtp-user
SMTP_PASS=dein-smtp-passwort
SMTP_FROM="SynSight <noreply@synsight.de>"
```

Hinweise:

- Keine Leerzeichen um `=`
- Passwort mit Sonderzeichen: URL-encoden (`@` → `%40`, `#` → `%23`) **oder** nur alphanumerisches Passwort verwenden
- `SMTP_FROM` in Anführungszeichen lassen

### SMTP noch nicht fertig? Temporär Links in den Logs (empfohlen jetzt)

Wenn die Logs `Connection timeout` / Browser `504` zeigen, SMTP blockiert
(Port 587/465 ausgehend oft bei VPS gesperrt). Bis SMTP steht:

```dotenv
EMAIL_DELIVERY_MODE=log-link
AUTO_VERIFY_EMAIL=false
```

Dann:

```bash
pm2 delete synsight
pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 logs synsight --lines 200 | grep email
```

Link öffnen → User wird `active`.

Bereits angelegte pending User manuell aktivieren:

```bash
mysql -u synsight -p synsight -e "UPDATE users SET status='active', email_verified_at=CURRENT_TIMESTAMP(3), role='user' WHERE email='wixertv@googlemail.com';"
```

---

## 4. Migrate / Seed / Build (dein bewährtes Format)

```bash
cd /opt/synsight

DATABASE_URL='mysql://synsight:NEUES_STARKES_PASSWORT@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:NEUES_STARKES_PASSWORT@localhost:3306/synsight' npm run db:seed
DATABASE_URL='mysql://synsight:NEUES_STARKES_PASSWORT@localhost:3306/synsight' npm run db:status
DATABASE_URL='mysql://synsight:NEUES_STARKES_PASSWORT@localhost:3306/synsight' npm run build
```

`db:status` muss `UP TO DATE` und Migration `006_…` als `ok` zeigen.

---

## 5. PM2 sauber neu starten (alte Config verwerfen)

Zuerst `.env.production` muss dasselbe DB-Passwort haben wie der funktionierende
Migrate-Befehl. Sonst: `Access denied for user 'synsight'@'localhost'`.

```bash
# Zeile prüfen (Passwort sichtbar — danach Terminal history beachten)
grep '^DATABASE_URL=' /opt/synsight/.env.production

# Gegenprobe: dasselbe Passwort muss lokal funktionieren
mysql -u synsight -p -e "SELECT 1;"
```

Falsches `.env` (ohne `.production`) kann verwirren — für PM2 zählt
`.env.production`. Optional umbenennen:

```bash
mv -f /opt/synsight/.env /opt/synsight/.env.unused.bak 2>/dev/null || true
```

```bash
cd /opt/synsight

# Alte/manuelle Config entfernen
pm2 delete synsight 2>/dev/null || true

# Repo-Config nutzen (lädt .env.production selbst; Datei schlägt Shell-Env)
pm2 start ecosystem.config.cjs --update-env
pm2 save

# Prüfen, ob DATABASE_URL im Prozess ankommt
pm2 env 0 | grep -E 'DATABASE_URL|APP_URL|EMAIL_DELIVERY|SMTP_HOST|SMTP_USER'
```

`DATABASE_URL` muss hier sichtbar sein und zum MariaDB-Passwort passen.
Wenn du `ecosystem.config.js` startest: nur den Repo-Wrapper verwenden.

---

## 6. Funktionstest

1. Neue E-Mail unter `/register` (nicht eine, die schon in `users` steht)
2. Erwartung: Redirect zu `/verify-email` (kein harter Abbruch mehr)
3. Bei `provider`: Mail prüfen; bei `log-link`: Link aus `pm2 logs`
4. Link öffnen → Login → `/dashboard`

DB prüfen:

```bash
mysql -u synsight -p synsight -e "SELECT id,email,role,status,email_verified_at FROM users ORDER BY id DESC LIMIT 10;"
```

Erwartung für neue User: `role=user`, erst `pending_verification`, nach Link `active`.

---

## 7. Schon angelegte „halbe“ User

Wenn ein User schon in der DB ist, aber die Registrierung damals abgebrochen ist:

```sql
-- Status prüfen
SELECT id,email,role,status,email_verified_at FROM users WHERE email='deine@mail.de';
```

Option A — erneut verifizieren lassen (App: „Verifizierung erneut senden“, falls vorhanden)  
Option B — temporär aktivieren zum Testen:

```sql
UPDATE users
SET status='active', email_verified_at=CURRENT_TIMESTAMP(3), role='user'
WHERE email='deine@mail.de';
```

Danach Login mit dem gewählten Passwort.
