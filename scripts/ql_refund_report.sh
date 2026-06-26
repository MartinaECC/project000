#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/ql/data/scripts/project000}"
NODE_BIN="${NODE_BIN:-node}"
NPM_BIN="${NPM_BIN:-npm}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

cd "$PROJECT_DIR"

if [ -z "${FONTCONFIG_FILE:-}" ] && [ -f "$PROJECT_DIR/vendor/fonts/fonts.conf" ]; then
  export FONTCONFIG_FILE="$PROJECT_DIR/vendor/fonts/fonts.conf"
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only
fi

LOCK_HASH_FILE="node_modules/.package-lock.sha256"
CURRENT_LOCK_HASH=""
if [ -f package-lock.json ]; then
  CURRENT_LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
fi

if [ ! -d node_modules ] || [ ! -f "$LOCK_HASH_FILE" ] || [ "$(cat "$LOCK_HASH_FILE" 2>/dev/null || true)" != "$CURRENT_LOCK_HASH" ]; then
  "$NPM_BIN" ci
  if [ -n "$CURRENT_LOCK_HASH" ]; then
    mkdir -p node_modules
    printf '%s' "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
  fi
fi

if ! "$PYTHON_BIN" -c "import rangersdk" >/dev/null 2>&1; then
  "$PYTHON_BIN" -m pip install rangersdk
fi

"$NODE_BIN" scripts/send_refund_report_once.mjs
