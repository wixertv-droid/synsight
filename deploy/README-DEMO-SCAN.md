# Demo-Scan (nur SpiderFoot)

Zwei getrennte Server. Den Fix immer auf dem **richtigen** Host ausführen.

| Rolle        | Host (Beispiel)              | Was läuft dort                                   |
| ------------ | ---------------------------- | ------------------------------------------------ |
| **Contabo**  | `vmd160239` · `161.97.85.22` | SpiderFoot `:5001` + Flask `/opt/api.py` `:5000` |
| **SynSight** | `v220…` · `synsight.de`      | Next.js (PM2) — ruft nur Contabo `/api/scan` auf |

Der Landing-Demo-Scan nutzt **ausschließlich** echte SpiderFoot-Ergebnisse. Kein Google, DeHashed, SerpAPI.

---

## 1) Contabo (SpiderFoot + API) — hier liegt der aktuelle 404/502

Contabo hat oft **kein** SynSight-Git-Repo. Deshalb nicht `cp deploy/...` aus `/root` oder `~/spiderfoot`.

```bash
# Als root auf Contabo (vmd160239):
curl -fsSL https://raw.githubusercontent.com/wixertv-droid/synsight/cursor/demo-scan-502-fix-7c12/deploy/install-demo-scan-api.sh | bash
```

Manuell:

```bash
curl -fsSL https://raw.githubusercontent.com/wixertv-droid/synsight/cursor/demo-scan-502-fix-7c12/deploy/demo-scan-api.py -o /opt/api.py
pkill -f '/opt/api.py' || true
rm -f /tmp/synsight-demo-scan-cache.json
nohup python3 /opt/api.py >/var/log/synsight-demo-scan.log 2>&1 &

curl -s http://127.0.0.1:5000/api/health
# erwartet: "api_version":"demo-scan-sf-real-2","spiderfoot":true

curl -s -m 20 -X POST http://127.0.0.1:5000/api/debug/sf \
  -H 'Content-Type: application/json' \
  -d '{"query":"rene.eule@yahoo.de"}'
# erwartet: "ok":true und raw ["SUCCESS","…"] — NICHT HTTP 404

curl -s -m 60 -X POST http://127.0.0.1:5000/api/scan \
  -H 'Content-Type: application/json' \
  -d '{"query":"rene.eule@yahoo.de"}'
# erwartet: "status":"success","source":"spiderfoot"
```

Ursache des bisherigen `HTTP Error 404`: SpiderFoot/CherryPy verlangt die Form-Felder `modulelist` und `typelist` (auch leer). Ohne sie → 404.

---

## 2) SynSight-Server (Next.js / PM2)

Nur nachdem Contabo-Scan lokal `success` liefert:

```bash
# Auf SynSight-Host (/opt/synsight):
cd /opt/synsight
git fetch origin
git checkout cursor/demo-scan-502-fix-7c12
git pull origin cursor/demo-scan-502-fix-7c12

# Env prüfen — muss auf Contabo zeigen, NICHT auf 127.0.0.1:
grep DEMO_SCAN .env* ecosystem.config.* || true
# DEMO_SCAN_API_URL=http://161.97.85.22:5000/api/scan

npm run build
pm2 restart synsight --update-env
# oder: pm2 start ecosystem.config.cjs --update-env
```

**Nicht** auf dem SynSight-Host testen mit `curl http://127.0.0.1:5000/...` — dort läuft die Contabo-API nicht.

Stattdessen:

```bash
curl -s -m 60 -X POST http://127.0.0.1:3000/api/scan \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://synsight.de' \
  -d '{"query":"rene.eule@yahoo.de"}'
```

(Port ggf. anpassen, je nach PM2/`PORT`.)

Browser: Hard-Refresh (Ctrl+Shift+R), damit der Server-Action-Fehler `"7u"` verschwindet.
