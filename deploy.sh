#!/usr/bin/env bash
# Deploy script for the Linux host: git pull, rebuild, restart the systemd
# service. Run from anywhere; it cd's to its own directory first.
set -euo pipefail

SERVICE="opentradenet-companion"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"

echo "==> git pull"
git pull --ff-only

echo "==> npm install"
npm install

echo "==> npm run build"
npm run build

echo "==> restarting ${SERVICE}"
sudo systemctl restart "$SERVICE"

echo "==> status"
sudo systemctl status "$SERVICE" --no-pager
