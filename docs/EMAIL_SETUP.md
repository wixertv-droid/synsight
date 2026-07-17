# SynSight E-Mail Setup (Produktion)

## Übersicht

SynSight versendet E-Mails über **Nodemailer + Netcup SMTP**.

| Zweck         | Absender (sichtbar)    | Auth-User   | Empfänger       |
| ------------- | ---------------------- | ----------- | --------------- |
| Verifikation  | `SMTP_FROM` (noreply@) | `SMTP_USER` | Benutzer        |
| Kontakt       | contact@synsight.de    | noreply@    | `CONTACT_EMAIL` |
| Presse        | press@synsight.de      | noreply@    | `PRESS_EMAIL`   |
| Partnerschaft | partners@synsight.de   | noreply@    | `PARTNER_EMAIL` |

Auth läuft immer über `noreply@synsight.de`. Das sichtbare From kann je Kanal abweichen (Aliase empfohlen).

---

## 1. `.env.production` anlegen / ergänzen

Pfad typisch: `/opt/synsight/.env.production` oder `/var/www/synsight/.env.production`

```bash
EMAIL_DELIVERY_MODE=provider
AUTO_VERIFY_EMAIL=false

SMTP_HOST=mxf920.netcup.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@synsight.de
SMTP_PASS='Shorty2306198!'
SMTP_FROM="SynSight <noreply@synsight.de>"

CONTACT_EMAIL=contact@synsight.de
PRESS_EMAIL=press@synsight.de
PARTNER_EMAIL=partners@synsight.de
```

Lokal: dieselben Werte in `.env.local` (nie committen).

---

## 2. Dependencies & Build

```bash
cd /opt/synsight   # oder /var/www/synsight
git fetch origin
git pull
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
```

---

## 3. PM2 Neustart

```bash
pm2 restart ecosystem.config.cjs --update-env
# oder:
pm2 restart synsight --update-env
pm2 save
```

Prüfen:

```bash
pm2 env 0 | grep -E 'EMAIL_DELIVERY|SMTP_|CONTACT_EMAIL|PRESS_EMAIL|PARTNER_EMAIL'
```

`EMAIL_DELIVERY_MODE` muss `provider` sein. `SMTP_PASS` darf nicht leer sein.

---

## 4. Testmail senden

```bash
cd /opt/synsight
npm run email:test -- deine@email.de
```

Das Skript lädt automatisch `.env.production` (wie PM2). Du musst SMTP_* nicht manuell exportieren.

Erfolg: `loaded env from: .env.production` → `verify ok` → `sent` mit `messageId`.

Wenn `Missing: SMTP_HOST, SMTP_USER, …` erscheint: Werte fehlen in `.env.production` oder Datei liegt nicht in `/opt/synsight/`.

```bash
grep -E '^SMTP_|^EMAIL_DELIVERY' /opt/synsight/.env.production
```

---

## 5. Bekannte Fehler aus Logs

### `Connection timeout`

Ursache: Outbound-Port 465 blockiert oder SMTP unerreichbar.

SynSight versucht automatisch **Fallback auf Port 587 (STARTTLS)**.

Manuell prüfen:

```bash
# Port 465
timeout 8 bash -c 'cat < /dev/null > /dev/tcp/mxf920.netcup.net/465' && echo OK465 || echo FAIL465

# Port 587
timeout 8 bash -c 'cat < /dev/null > /dev/tcp/mxf920.netcup.net/587' && echo OK587 || echo FAIL587
```

Falls 465 failt, in `.env.production` setzen:

```bash
SMTP_PORT=587
SMTP_SECURE=false
```

Firewall (falls ufw):

```bash
# Outbound ist meist offen; bei restriktiven Regeln SMTP erlauben
sudo ufw status
```

### `Cannot find module '../server/lib/utils'`

Kaputte Next.js-Installation unter `node_modules`. Fix:

```bash
cd /opt/synsight
pm2 stop synsight
rm -rf node_modules .next
npm ci
DATABASE_URL='mysql://synsight:Shorty2306@localhost:3306/synsight' npm run build
pm2 start ecosystem.config.cjs --update-env
# oder: pm2 restart synsight --update-env
```

### `[email:fallback-log] verification delivery deferred…`

SMTP ist fehlgeschlagen, **Registrierung bleibt gültig**, Token bleibt aktiv. Benutzer kann „Erneut senden“ nutzen. Nach SMTP-Fix erneut registrieren oder Resend testen.

---

## 6. Security-Checkliste

- [ ] Keine SMTP-Passwörter im Frontend / Browser
- [ ] Secrets nur in `.env.production` / PM2 env
- [ ] Rate-Limits für Formulare aktiv (`COMMUNICATION_RATE_LIMIT`)
- [ ] Honeypot-Feld `website` auf Formularen
- [ ] Logs enthalten keine Passwörter / keine Raw-Tokens bei Provider-Fehlern
- [ ] `contact@` / `press@` / `partners@` als Aliase oder Postfächer bei Netcup angelegt

---

## 7. End-to-End Prüfung

1. Registrierung mit echter Inbox → Mail „Bestätigen Sie Ihr SynSight Konto“
2. Link klicken → Konto aktiv → Login
3. `/contact` absenden → Mail an `CONTACT_EMAIL`
4. `/press` und `/partners` analog
5. `pm2 logs synsight --lines 100` zeigt `[email:smtp] delivered via …`
