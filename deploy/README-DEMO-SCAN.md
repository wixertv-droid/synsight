# Demo-Scan · Multi-Modul (Contabo)

| Server       | Host                          | Aufgabe                                    |
| ------------ | ----------------------------- | ------------------------------------------ |
| **Contabo**  | `vmd160239` · `161.97.85.22`  | Docker `/opt/osint-api` · Port **5002**    |
| **SynSight** | `/opt/synsight` · synsight.de | Next.js — Proxy `/api/scan` mit Bearer-Key |

Module (ohne SpiderFoot): **Holehe → Maigret → PhoneInfoga → theHarvester → Photon**  
Nur ausgefüllte Felder werden gescannt. Exposure-Score kommt aus diesen Modul-Treffern.

---

## A) Contabo — Docker API (Port 5002)

```bash
# Auf Contabo als root:
cd /opt/osint-api
# api.py aus Repo aktualisieren (Branch nach Deploy anpassen):
curl -fsSL https://raw.githubusercontent.com/wixertv-droid/synsight/cursor/hud-redesign-review-7c12/deploy/contabo-deep-api.py \
  -o /opt/osint-api/api.py   # oder wo euer Compose das File mountet

# API_KEY muss exakt dem Admin-Eintrag entsprechen (kein !! im Key):
# docker-compose.yml: ports "5002:5000", API_KEY=demoscanner23061980

docker compose up -d --build
curl -s http://127.0.0.1:5002/api/health | python3 -m json.tool

# Auth-Check (erwartet 400 missing query, NICHT 401):
curl -s -X POST http://127.0.0.1:5002/api/scan \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer demoscanner23061980' \
  -d '{}'
```

### API-Key — **zwei Stellen identisch**

| Wo                 | Was                                                                   |
| ------------------ | --------------------------------------------------------------------- |
| **Contabo**        | Docker `API_KEY=…` → Container neu starten                            |
| **SynSight Admin** | Website → APIs → Contabo DemoScanner → denselben Key → **API TESTEN** |

---

## B) SynSight — Next.js

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/hud-redesign-review-7c12
git pull origin cursor/hud-redesign-review-7c12

npm run build
pm2 restart synsight --update-env
```

Admin: **Website → APIs & Integrationen → Contabo DemoScanner**

- API-URL: `http://161.97.85.22:5002/api/scan`
- Bearer-Key: Contabo `API_KEY` (z. B. `demoscanner23061980`)
- Speichern → **API TESTEN**

Browser: Ctrl+Shift+R.

### Nginx (SynSight-Host)

```nginx
location /api/scan {
    proxy_pass http://127.0.0.1:3000;
    proxy_read_timeout 90s;
    proxy_send_timeout 90s;
    proxy_connect_timeout 30s;
}
```

`nginx -t && systemctl reload nginx`

Contabo Single-Module-Body: `{"query":"…","module":"holehe"}`  
Module: `holehe | maigret | phoneinfoga | theHarvester | photon`
