# Demo-Scan · Multi-Modul (Contabo)

| Server       | Host                          | Aufgabe                                       |
| ------------ | ----------------------------- | --------------------------------------------- |
| **Contabo**  | `vmd160239` · `161.97.85.22`  | `/opt/api.py` + SpiderFoot + holehe/maigret/… |
| **SynSight** | `/opt/synsight` · synsight.de | Next.js — Proxy `/api/scan` mit Bearer-Key    |

Nur ausgefüllte Felder werden gescannt. Module werden getrennt angezeigt.

---

## A) Contabo — API deployen

Empfohlen (Multi-Field + echte SpiderFoot-Events):

```bash
# Auf Contabo als root:
curl -fsSL https://raw.githubusercontent.com/wixertv-droid/synsight/cursor/demoscanner-multimodule-7c12/deploy/contabo-deep-api.py -o /opt/api.py

# !! in Bash = History — IMMER einfache Anführungszeichen:
export API_KEY='demoscanner23061980!!'
export SPIDERFOOT_URL='http://172.17.0.1:5001'   # oder http://127.0.0.1:5001

pkill -f '/opt/api.py' || true
nohup env API_KEY="$API_KEY" SPIDERFOOT_URL="$SPIDERFOOT_URL" \
  python3 /opt/api.py >/var/log/synsight-demo-scan.log 2>&1 &

# Auth-Check (erwartet 400 missing query, NICHT 401):
curl -s -X POST http://127.0.0.1:5000/api/scan \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{}'

# Laufenden Key prüfen:
tr '\0' '\n' < /proc/$(pgrep -nf '/opt/api.py')/environ | grep '^API_KEY='
```

Wenn du bei deiner **eigenen** `api.py` bleibst: SynSight ruft sie mit `Authorization: Bearer …` und `{query}` pro Feld auf (Fallback).

---

## B) SynSight — Next.js

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/demoscanner-multimodule-7c12
git pull origin cursor/demoscanner-multimodule-7c12

npm run build
pm2 restart synsight --update-env
```

Dann im Admin: **Website → APIs & Integrationen → Contabo DemoScanner**

- API-URL: `http://161.97.85.22:5000/api/scan`
- Bearer-Key: dein Contabo `API_KEY`
- Speichern → **API TESTEN** (Health + Auth-Probe, kein voller Scan)

Optionaler Env-Fallback (nur wenn Admin-Eintrag fehlt): `DEMO_SCAN_API_URL` / `DEMO_SCAN_API_KEY`.

Browser: Ctrl+Shift+R.

**Nicht** auf SynSight `curl 127.0.0.1:5000` testen — die Deep-API liegt nur auf Contabo.

### Nginx (SynSight-Host)

Module laufen **nacheinander** (kurze Requests). Trotzdem ≥ 90s pro Schritt:

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
Module: `holehe | maigret | phoneinfoga | theHarvester | photon | spiderfoot`
