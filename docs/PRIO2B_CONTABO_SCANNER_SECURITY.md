# Prio 2B — Contabo DemoScanner absichern

Ziel: Der Scanner auf Port 5002 ist kein öffentlich nutzbarer Dienst. Nur der SynSight-Hauptserver darf ihn erreichen. Browser rufen ausschließlich `https://synsight.de/api/scan` auf.

## 1. SynSight-Hauptserver-IP feststellen

Auf dem SynSight-Hauptserver ausführen:

```bash
curl -4 -s https://api.ipify.org ; echo
```

Diese IPv4 im Folgenden als `SYNSIGHT_SERVER_IP` verwenden. Keine dynamische Client-/Heim-IP eintragen.

## 2. Contabo-Dateien sichern

Auf dem Contabo-Scanner:

```bash
cd /opt
cp /opt/api.py /opt/api.py.backup.$(date +%F-%H%M%S)
mkdir -p /var/lib/synsight-demo-scan
chmod 700 /var/lib/synsight-demo-scan
```

## 3. Aktuelle gesicherte API installieren

```bash
curl -fsSL \
  https://raw.githubusercontent.com/wixertv-droid/synsight/cursor/prio2b-contabo-edge-security-7c12/deploy/contabo-deep-api.py \
  -o /opt/api.py
chmod 700 /opt/api.py
python3 -m py_compile /opt/api.py
```

`python3 -m py_compile` muss ohne Ausgabe enden.

## 4. Neuen API-Key erzeugen

```bash
openssl rand -hex 32
```

Den ausgegebenen Wert nur an zwei Stellen verwenden:

1. Contabo: `/etc/synsight-demo-scan.env`
2. SynSight Admin: Website → APIs → DemoScanner

Den Key nicht in GitHub, Shell-Historie, Screenshots oder Chat kopieren.

## 5. Geschützte Environment-Datei anlegen

```bash
nano /etc/synsight-demo-scan.env
```

Inhalt mit echten Werten:

```env
API_KEY=DEIN_NEUER_LANGER_API_KEY
API_BIND=0.0.0.0
API_PORT=5002

ALLOWED_CLIENT_IPS=127.0.0.1/32,::1/128,SYNSIGHT_SERVER_IP/32
REQUIRE_CLIENT_ALLOWLIST=true
HEALTH_VERBOSE=false

PERSIST_RESULTS=false
RESULT_PATH=/var/lib/synsight-demo-scan/results

MAX_BODY_BYTES=16384
MAX_QUERY_LENGTH=160
MAX_CONCURRENT_SCANS=2

HOLEHE_TIMEOUT=45
MAIGRET_TIMEOUT=55
PHONEINFOGA_TIMEOUT=35
```

Danach schützen:

```bash
chown root:root /etc/synsight-demo-scan.env
chmod 600 /etc/synsight-demo-scan.env
```

## 6. systemd-Service installieren

```bash
curl -fsSL \
  https://raw.githubusercontent.com/wixertv-droid/synsight/cursor/prio2b-contabo-edge-security-7c12/deploy/synsight-demo-scan.service \
  -o /etc/systemd/system/synsight-demo-scan.service

systemctl daemon-reload
```

Alte manuelle Prozesse beenden, bevor systemd startet:

```bash
pkill -f '/opt/api.py' || true
sleep 2
ss -ltnp | grep -E ':5000|:5002' || true
```

Service starten:

```bash
systemctl enable --now synsight-demo-scan
systemctl status synsight-demo-scan --no-pager
journalctl -u synsight-demo-scan -n 80 --no-pager
```

## 7. UFW-Regeln setzen

Vor Aktivierung immer SSH erlauben:

```bash
ufw allow OpenSSH
```

Dann spezifische Freigabe zuerst einfügen und anschließend alle anderen Zugriffe auf Port 5002 sperren:

```bash
ufw insert 1 allow from SYNSIGHT_SERVER_IP to any port 5002 proto tcp comment 'SynSight main server'
ufw deny 5002/tcp comment 'Block public DemoScanner access'
ufw status numbered
```

Falls UFW noch inaktiv ist:

```bash
ufw enable
ufw status verbose
```

Die spezifische `ALLOW`-Regel für die SynSight-IP muss in der Liste vor der allgemeinen `DENY`-Regel stehen.

Port 5000 darf nicht mehr lauschen:

```bash
ss -ltnp | grep -E ':5000|:5002'
```

Erwartung: nur Port 5002 durch den neuen Service.

## 8. Lokal auf Contabo testen

API-Key nur temporär aus der geschützten Env laden:

```bash
set -a
. /etc/synsight-demo-scan.env
set +a

curl -sS \
  -H "Authorization: Bearer $API_KEY" \
  http://127.0.0.1:5002/api/health
```

Erwartete Form:

```json
{"ok":true,"ready":true,"service":"synsight-demo-scan","api_version":"contabo-free-2"}
```

Ohne Key muss der Health-Endpunkt `401` liefern:

```bash
curl -i http://127.0.0.1:5002/api/health
```

## 9. Vom SynSight-Hauptserver testen

Auf dem SynSight-Hauptserver:

```bash
export DEMO_SCAN_TEST_KEY='DEIN_NEUER_LANGER_API_KEY'

curl -sS \
  -H "Authorization: Bearer $DEMO_SCAN_TEST_KEY" \
  http://CONTABO_SERVER_IP:5002/api/health

unset DEMO_SCAN_TEST_KEY
```

Danach im SynSight-Admin speichern:

```text
API-URL: http://CONTABO_SERVER_IP:5002/api/scan
API-Key: der neue Key
Aktiv: Ja
```

Dann `API TESTEN` drücken. Erwartet:

```text
DemoScanner erreichbar — Auth OK
Health OK · version=contabo-free-2 · ready=yes
```

## 10. Fremdzugriff prüfen

Von einem anderen Anschluss als dem SynSight-Server darf Port 5002 nicht nutzbar sein. Ein normaler Browser darf die Contabo-API nie direkt ansprechen.

## 11. Fehlerdiagnose

```bash
systemctl status synsight-demo-scan --no-pager
journalctl -u synsight-demo-scan -n 150 --no-pager
ss -ltnp | grep ':5002'
ufw status numbered
```

### HTTP 401

API-Key zwischen `/etc/synsight-demo-scan.env` und SynSight Admin stimmt nicht überein.

### HTTP 403

Die anfragende Server-IP fehlt in `ALLOWED_CLIENT_IPS`, oder die Anfrage kommt nicht vom erwarteten SynSight-Hauptserver.

### Timeout / Verbindung abgelehnt

UFW-Regel, Provider-Firewall, falsche Contabo-IP oder nicht laufender systemd-Service prüfen.

### Health `ready=false` oder HTTP 503

Mindestens einer der drei schnellen Prüfschritte ist auf dem Contabo-Server nicht verfügbar. Prüfen:

```bash
which holehe
which maigret
which phoneinfoga
```

Bei abweichenden Pfaden die passenden `*_BIN`-Variablen in `/etc/synsight-demo-scan.env` setzen und neu starten:

```bash
systemctl restart synsight-demo-scan
journalctl -u synsight-demo-scan -n 80 --no-pager
```

## Sicherheitswirkung

- Keine offene Browser-CORS-Freigabe mehr
- Health und Scan verlangen denselben API-Key
- Keine Toolpfade, Portdetails oder internen Modulnamen im Health-Response
- App-Allowlist plus Firewall-Allowlist
- Vergleich des API-Keys über konstantzeitlichen Vergleich
- Maximale Request-Größe und Query-Länge
- Begrenzte gleichzeitige Scans
- Keine Ergebnisspeicherung im Free-Scan als Standard
- Automatischer Neustart und systemd-Härtung
