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

# Key OHNE ! empfohlen (kein Bash-!!-Problem):
export API_KEY='synsight-demo-key'
export SPIDERFOOT_URL='http://127.0.0.1:5001'   # Docker-Host: http://172.17.0.1:5001

pkill -f '/opt/api.py' || true
nohup env API_KEY="$API_KEY" SPIDERFOOT_URL="$SPIDERFOOT_URL" \
  python3 /opt/api.py >/var/log/synsight-demo-scan.log 2>&1 &

# Health inkl. welche Tools gefunden wurden:
curl -s http://127.0.0.1:5000/api/health | python3 -m json.tool

# Auth-Check (erwartet 400 missing query, NICHT 401):
curl -s -X POST http://127.0.0.1:5000/api/scan \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{}'

# Tools im PATH?
which holehe maigret phoneinfoga photon theHarvester 2>/dev/null || true
```

### API-Key ändern (ohne `!!`) — **zwei Stellen**

| Wo                 | Was                                                                         |
| ------------------ | --------------------------------------------------------------------------- |
| **Contabo**        | `export API_KEY='synsight-demo-key'` → api.py neu starten                   |
| **SynSight Admin** | Website → APIs → Contabo DemoScanner → denselben Key speichern → API TESTEN |

Beide Werte müssen **identisch** sein.

````

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
````

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
