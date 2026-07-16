# MariaDB auf dem Server importieren

Alles für Schema + Admin-Seed liegt im Repo unter `database/`. Kein separater Dump nötig — Migrationen sind die Quelle der Wahrheit.

Bei Registrierungsfehlern / `Access denied` / SMTP siehe zusätzlich **`docs/VPS_DEPLOY_FIX.md`**.

## 1. Code holen

```bash
cd /path/to/synsight
git fetch origin
git checkout cursor/auth-flow-stabilize-7c12
git pull origin cursor/auth-flow-stabilize-7c12
```

## 2. Datenbank vorbereiten

Falls ein Datenbankpasswort in Chat, Logs oder Screenshots veröffentlicht wurde,
vor dem Deployment rotieren und danach nur noch in `.env.production` speichern.

```bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS synsight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'synsight'@'localhost' IDENTIFIED BY 'STARKES_PASSWORT';"
sudo mysql -e "GRANT ALL PRIVILEGES ON synsight.* TO 'synsight'@'localhost'; FLUSH PRIVILEGES;"
```

## 3. Umgebung

```bash
cp .env.production.example .env.production
# DATABASE_URL, SESSION_SECRET, IMAGE_ENCRYPTION_KEY und SMTP-Zugang setzen.
# Produktions-Auth:
#   ALLOW_PUBLIC_REGISTRATION=true
#   AUTO_VERIFY_EMAIL=false
#   EMAIL_DELIVERY_MODE=provider
#   CSRF_STRICT=true  (Browser same-origin Login funktioniert trotzdem)
#   APP_URL=https://synsight.de
```

`.env.production` wird von Next.js geladen. Keine Secrets in Git committen.

## 4. Schema + Seed importieren (wie beim bisherigen VPS-Setup)

```bash
npm ci

# Passwort lokal einsetzen; URL wegen Sonderzeichen in einfache Quotes setzen.
DATABASE_URL='mysql://synsight:<DB_PASSWORD>@localhost:3306/synsight' npm run db:migrate
DATABASE_URL='mysql://synsight:<DB_PASSWORD>@localhost:3306/synsight' npm run db:seed
DATABASE_URL='mysql://synsight:<DB_PASSWORD>@localhost:3306/synsight' npm run db:status
```

Enthaltene Dateien:

| Pfad                                          | Inhalt                |
| --------------------------------------------- | --------------------- |
| `database/migrations/001_*.sql` … `006_*.sql` | Schema                |
| `database/seeds/001_admin_user.sql`           | Admin-User (Argon2id) |
| `database/migrate.ts` / `seeds/seed.ts`       | Runner                |

Migration 006 ändert bestehende registrierte Konten von `demo` auf `user`.
Mit `NODE_ENV=production` oder `REQUIRE_DATABASE=true` startet der Auth-Zugriff
nicht mehr mit In-Memory-Daten, wenn `DATABASE_URL` fehlt.

## 5. E-Mail-Bestätigung konfigurieren

Für echte Zustellung wird ein SMTP-Konto benötigt, z. B. bei einem
Transaktionsmail-Anbieter. Auf dem VPS ist kein eigener eingehender Mailserver
notwendig.

```dotenv
APP_URL=https://synsight.de
AUTO_VERIFY_EMAIL=false
EMAIL_DELIVERY_MODE=provider

SMTP_HOST=smtp.provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=SMTP_BENUTZER
SMTP_PASS=SMTP_PASSWORT
SMTP_FROM="SynSight <noreply@synsight.de>"
```

- Port 587: STARTTLS, `SMTP_SECURE=false`
- Port 465: TLS ab Verbindungsstart, `SMTP_SECURE=true`
- Der VPS muss ausgehend zum SMTP-Port verbinden dürfen.
- Absenderdomain beim Anbieter bestätigen; SPF und DKIM gemäß Anbieter setzen.
- DMARC wird für produktive Zustellung empfohlen.
- `APP_URL` muss exakt `https://synsight.de` sein, damit der Link stimmt.

Nur zum Testen ohne echte Zustellung:

```dotenv
AUTO_VERIFY_EMAIL=false
EMAIL_DELIVERY_MODE=log-link
```

Dann erscheint der Bestätigungslink in `pm2 logs synsight`. `log-link` ist
nicht für den produktiven Betrieb gedacht.

## 6. App bauen und starten

```bash
DATABASE_URL='mysql://synsight:<DB_PASSWORD>@localhost:3306/synsight' npm run build
pm2 start ecosystem.config.cjs --update-env
# oder: pm2 restart synsight --update-env
```

Danach:

- Registrieren unter `/register` → Status `pending_verification`
- Link aus E-Mail öffnen → Status `active`, `email_verified_at` gesetzt
- Danach unter `/login` einloggen
- Dashboard, Identitätsprofil, Einstellungen nutzbar
- Admin-Fallback: `admin@synsight.local` / `admin`

## Optional: Roh-SQL ohne npm

```bash
mysql -u synsight -p synsight < database/migrations/001_initial_schema.sql
mysql -u synsight -p synsight < database/migrations/002_production_identity.sql
mysql -u synsight -p synsight < database/migrations/003_digital_traces_images.sql
mysql -u synsight -p synsight < database/migrations/004_admin_role_and_compat.sql
mysql -u synsight -p synsight < database/migrations/005_identity_profile_fields.sql
mysql -u synsight -p synsight < database/migrations/006_production_user_role.sql
mysql -u synsight -p synsight < database/seeds/001_admin_user.sql
```

Empfohlen bleibt `npm run db:migrate` (Schema-History-Tabelle, idempotent).
