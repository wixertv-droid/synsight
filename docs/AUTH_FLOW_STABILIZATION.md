# Auth-Flow Stabilisierung — Abschlussbericht

**Branch:** `cursor/auth-flow-stabilize-7c12`  
**Ziel-URL:** `https://synsight.de`  
**Status:** AUTH FLOW FREIGEGEBEN · DATABASE TEST READY

---

## 1. Analyse

### Flow

```
/register → User + Profile + Security Profile
         → AUTO_VERIFY_EMAIL ? activate : verification token (log-link)
         → /login
         → POST /api/auth/login
         → Argon2id + Session + HttpOnly Cookie
         → /dashboard
```

### Was funktionierte

| Bereich                                  | Status |
| ---------------------------------------- | ------ |
| User-Erstellung (MariaDB / In-Memory)    | OK     |
| Passwort-Hash Argon2id                   | OK     |
| Profile + security_profiles bei Register | OK     |
| Session-Token (HMAC) + Cookie-Flags      | OK     |
| Middleware Dashboard-Guard               | OK     |
| Admin-Seed Hash (`admin` / Argon2id)     | OK     |
| Auto-Verify / log-link Verifikation      | OK     |

### Was blockierte

| Symptom                                                                       | Ursache                                                                                                                                                                                                      | Datei                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `POST /api/auth/login` → **403** „Die Anfrage konnte nicht bestätigt werden.“ | CSRF `validateMutationOrigin` verglich Browser-`Origin` (`https://synsight.de`) mit Node-`request.url` / `Host` (`http://127.0.0.1:3000`). Ohne korrektes `X-Forwarded-*` oder passendes `APP_URL` → Reject. | `src/lib/security/request.ts` |
| Optional: Seed ohne `email_verified_at` bei Re-Seed                           | `ON DUPLICATE KEY UPDATE` / programmatic update setzte Verifikation nicht nach                                                                                                                               | `database/seeds/*`            |

`middleware.ts` war **nicht** die 403-Ursache (Matcher nur für Dashboard/Profile/Settings).

---

## 2. CSRF / Proxy-Fix

Saubere Schichtung (Production bleibt geschützt):

1. **`Sec-Fetch-Site: same-origin`** → erlauben (Browser-Garantie; funktioniert hinter nginx/HTTPS)
2. **`cross-site`** → ablehnen
3. **Origin/Referer** gegen `APP_URL` + Proxy-Host, **http/https-tolerant** (Hostname-Match)
4. **Fehlendes Origin:** in Production standardmäßig ablehnen (`CSRF_STRICT` default true), in Development/Tests offen

Session-Cookies unverändert:

- HttpOnly
- SameSite=Lax
- Secure wenn `APP_URL` https / `COOKIE_SECURE=true`

---

## 3. Admin Test Account

| Feld              | Wert                                                      |
| ----------------- | --------------------------------------------------------- |
| Email             | `admin@synsight.local`                                    |
| Passwort          | `admin` (nur Klartext zum Tippen — DB speichert Argon2id) |
| status            | `active`                                                  |
| email_verified_at | gesetzt (Seed)                                            |
| role              | `admin`                                                   |

Seed: `npm run db:seed` bzw. `database/seeds/001_admin_user.sql`

---

## 4–6. Register / Verify / Login

- Register legt `users` + `profiles` + `security_profiles` an
- `AUTO_VERIFY_EMAIL=true` → sofort `active`, Redirect `/login?registered=1`
- `AUTO_VERIFY_EMAIL=false` + `EMAIL_DELIVERY_MODE=log-link` → Token in DB, Link in Server-Logs
- Login: Email/Username → Argon2 → Status → Session → Cookie → `/dashboard`

---

## 7. Empfohlene Server-Checks

```bash
git fetch && git checkout cursor/auth-flow-stabilize-7c12 && git pull
export APP_URL=https://synsight.de
# DATABASE_URL, SESSION_SECRET, IMAGE_ENCRYPTION_KEY gesetzt
npm ci && npm run db:migrate && npm run db:seed
npm run build
pm2 restart synsight --update-env
```

Nginx (Mindestens):

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Manuelle Tests:

1. Admin-Login `admin@synsight.local` / `admin`
2. Neue Registrierung
3. User in DB prüfen
4. Login neuer User
5. Logout → Session weg, Dashboard redirect `/login`

---

## 8. Tests

- Unit/API: CSRF-Proxy-Fälle, Login Erfolg/Fehler, Logout, Auto-Verify-Register
- E2E: Admin Login → Dashboard → Logout; Register → Login → Dashboard → Logout

---

## 9. Quality Gates

Siehe CI-/Agent-Lauf: `typecheck`, `lint`, `test`, `build`, `test:e2e`.
