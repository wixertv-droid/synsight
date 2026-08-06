#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-/etc/synsight-demo-scan.env}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Environment-Datei nicht lesbar: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${API_KEY:?API_KEY fehlt in $ENV_FILE}"
API_BIND_TEST="127.0.0.1"
API_PORT="${API_PORT:-5002}"
BASE_URL="http://${API_BIND_TEST}:${API_PORT}"

echo "[1/4] Python-Syntax"
python3 -m py_compile /opt/api.py

echo "[2/4] Service/Port"
systemctl is-active --quiet synsight-demo-scan
ss -ltnp | grep -q ":${API_PORT}"

echo "[3/4] Authentifizierter Health-Check"
HEALTH_FILE="$(mktemp)"
trap 'rm -f "$HEALTH_FILE" /tmp/synsight-health-unauth.$$' EXIT
HTTP_AUTH="$(curl -sS -o "$HEALTH_FILE" -w '%{http_code}' \
  -H "Authorization: Bearer ${API_KEY}" \
  "${BASE_URL}/api/health")"
cat "$HEALTH_FILE"
echo
if [[ "$HTTP_AUTH" != "200" && "$HTTP_AUTH" != "503" ]]; then
  echo "Unerwarteter Health-Status: $HTTP_AUTH" >&2
  exit 1
fi

echo "[4/4] Health ohne Key muss 401 liefern"
HTTP_UNAUTH="$(curl -sS -o "/tmp/synsight-health-unauth.$$" -w '%{http_code}' \
  "${BASE_URL}/api/health")"
if [[ "$HTTP_UNAUTH" != "401" ]]; then
  echo "Health ohne Key lieferte HTTP $HTTP_UNAUTH statt 401" >&2
  cat "/tmp/synsight-health-unauth.$$" >&2 || true
  exit 1
fi

echo "OK: Scanner-Service, Port, Auth und Health verifiziert."
