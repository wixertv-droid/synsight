#!/usr/bin/env bash
# Install Contabo multi-module deep-scan API. Run on CONTABO only.
set -euo pipefail

BRANCH="${SYNSIGHT_DEMO_SCAN_BRANCH:-cursor/demoscanner-multimodule-7c12}"
RAW_URL="https://raw.githubusercontent.com/wixertv-droid/synsight/${BRANCH}/deploy/contabo-deep-api.py"
TARGET="${DEMO_SCAN_API_PATH:-/opt/api.py}"
LOG="${DEMO_SCAN_LOG:-/var/log/synsight-demo-scan.log}"
# Prefer a key WITHOUT ! (bash history expansion). Override via env.
API_KEY="${API_KEY:-synsight-demo-key}"
SPIDERFOOT_URL="${SPIDERFOOT_URL:-http://127.0.0.1:5001}"

echo "==> Contabo deep-scan API"
echo "    source: $RAW_URL"
echo "    spiderfoot: $SPIDERFOOT_URL"

tmp="$(mktemp)"
curl -fsSL "$RAW_URL" -o "$tmp"
python3 -m py_compile "$tmp"
install -m 755 "$tmp" "$TARGET"
rm -f "$tmp"

pkill -f "$TARGET" 2>/dev/null || true
sleep 1
nohup env API_KEY="$API_KEY" SPIDERFOOT_URL="$SPIDERFOOT_URL" \
  python3 "$TARGET" >>"$LOG" 2>&1 &
sleep 1

echo "==> Health:"
curl -sS http://127.0.0.1:5000/api/health || true
echo
echo "Test:"
echo "  curl -s -m 180 -X POST http://127.0.0.1:5000/api/scan -H 'Content-Type: application/json' -H \"Authorization: Bearer \$API_KEY\" -d '{\"email\":\"test@example.com\"}'"
