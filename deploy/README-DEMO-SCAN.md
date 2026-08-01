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

export API_KEY='demoscanner23061980!!'
# Docker-Host → SpiderFoot, sonst 127.0.0.1:
export SPIDERFOOT_URL='http://172.17.0.1:5001'

pkill -f '/opt/api.py' || true
nohup env API_KEY="$API_KEY" SPIDERFOOT_URL="$SPIDERFOOT_URL" \
  python3 /opt/api.py >/var/log/synsight-demo-scan.log 2>&1 &

curl -s http://127.0.0.1:5000/api/health
# erwartet: api_version contabo-deep-2, spiderfoot:true

curl -s -m 180 -X POST http://127.0.0.1:5000/api/scan \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"email":"rene.eule@yahoo.de"}'
```

Wenn du bei deiner **eigenen** `api.py` bleibst: SynSight ruft sie mit `Authorization: Bearer …` und `{query}` pro Feld auf (Fallback).

---

## B) SynSight — Next.js

```bash
cd /opt/synsight
git fetch origin
git checkout cursor/demoscanner-multimodule-7c12
git pull origin cursor/demoscanner-multimodule-7c12

# in .env.production:
# DEMO_SCAN_API_URL=http://161.97.85.22:5000/api/scan
# DEMO_SCAN_API_KEY=demoscanner23061980!!
# DEMO_SCAN_TIMEOUT_MS=320000

npm run build
pm2 restart synsight --update-env
```

Browser: Ctrl+Shift+R.

**Nicht** auf SynSight `curl 127.0.0.1:5000` testen — die Deep-API liegt nur auf Contabo.
