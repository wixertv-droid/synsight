#!/usr/bin/env bash
# Install / update Contabo demo-scan API (SpiderFoot only).
# Run on CONTABO (vmd160239), NOT on the SynSight Next.js host.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/wixertv-droid/synsight/cursor/demo-scan-502-fix-7c12/deploy/install-demo-scan-api.sh | bash
set -euo pipefail

BRANCH="${SYNSIGHT_DEMO_SCAN_BRANCH:-cursor/demo-scan-502-fix-7c12}"
RAW_URL="https://raw.githubusercontent.com/wixertv-droid/synsight/${BRANCH}/deploy/demo-scan-api.py"
TARGET="${DEMO_SCAN_API_PATH:-/opt/api.py}"
LOG="${DEMO_SCAN_LOG:-/var/log/synsight-demo-scan.log}"

echo "==> Contabo demo-scan API install"
echo "    source: $RAW_URL"
echo "    target: $TARGET"

tmp="$(mktemp)"
curl -fsSL "$RAW_URL" -o "$tmp"
python3 -m py_compile "$tmp"
install -m 755 "$tmp" "$TARGET"
rm -f "$tmp"

rm -f /tmp/synsight-demo-scan-cache.json
pkill -f "$TARGET" 2>/dev/null || true
sleep 1

nohup python3 "$TARGET" >>"$LOG" 2>&1 &
sleep 1

echo "==> Health:"
curl -sS http://127.0.0.1:5000/api/health || true
echo
echo "==> Probe startscan fields (expect SUCCESS or ERROR JSON, not HTTP 404):"
curl -sS -m 20 -X POST http://127.0.0.1:5000/api/debug/sf \
  -H 'Content-Type: application/json' \
  -d '{"query":"rene.eule@yahoo.de"}' || true
echo
echo "Done. Full scan test:"
echo "  curl -s -m 60 -X POST http://127.0.0.1:5000/api/scan -H 'Content-Type: application/json' -d '{\"query\":\"rene.eule@yahoo.de\"}'"
