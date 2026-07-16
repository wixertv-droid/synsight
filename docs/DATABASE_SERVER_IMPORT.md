# MariaDB auf dem Server importieren

Alles für Schema + Admin-Seed liegt im Repo unter `database/`. Kein separater Dump nötig — Migrationen sind die Quelle der Wahrheit.

## 1. Code holen

```bash
cd /path/to/synsight
git fetch origin
git checkout cursor/open-auth-for-db-testing-7c12
git pull origin cursor/open-auth-for-db-testing-7c12
```

## 2. Datenbank vorbereiten

```bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS synsight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'synsight'@'localhost' IDENTIFIED BY 'STARKES_PASSWORT';"
sudo mysql -e "GRANT ALL PRIVILEGES ON synsight.* TO 'synsight'@'localhost'; FLUSH PRIVILEGES;"
```

## 3. Umgebung

```bash
cp .env.production.example .env.production
# DATABASE_URL, SESSION_SECRET, IMAGE_ENCRYPTION_KEY, APP_URL setzen
# Auth-Testing-Flags stehen schon offen:
#   ALLOW_PUBLIC_REGISTRATION=true
#   AUTO_VERIFY_EMAIL=true
#   EMAIL_DELIVERY_MODE=log-link
#   CSRF_STRICT=false
export $(grep -v '^#' .env.production | xargs)
```

## 4. Schema + Seed importieren

```bash
npm ci
npm run db:migrate   # 001–005 idempotent
npm run db:seed      # Admin: admin@synsight.local / admin
npm run db:status
```

Enthaltene Dateien:

| Pfad                                          | Inhalt                |
| --------------------------------------------- | --------------------- |
| `database/migrations/001_*.sql` … `005_*.sql` | Schema                |
| `database/seeds/001_admin_user.sql`           | Admin-User (Argon2id) |
| `database/migrate.ts` / `seeds/seed.ts`       | Runner                |

## 5. App starten (Auth offen)

```bash
npm run build
pm2 start ecosystem.config.cjs --update-env
# oder: pm2 restart synsight --update-env
```

Danach:

- Registrieren unter `/register` → Konto sofort aktiv
- Einloggen unter `/login`
- Dashboard, Identitätsprofil, Einstellungen nutzbar
- Admin-Fallback: `admin@synsight.local` / `admin`

## Optional: Roh-SQL ohne npm

```bash
mysql -u synsight -p synsight < database/migrations/001_initial_schema.sql
mysql -u synsight -p synsight < database/migrations/002_production_identity.sql
mysql -u synsight -p synsight < database/migrations/003_digital_traces_images.sql
mysql -u synsight -p synsight < database/migrations/004_admin_role_and_compat.sql
mysql -u synsight -p synsight < database/migrations/005_identity_profile_fields.sql
mysql -u synsight -p synsight < database/seeds/001_admin_user.sql
```

Empfohlen bleibt `npm run db:migrate` (Schema-History-Tabelle, idempotent).
