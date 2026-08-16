#!/usr/bin/env bash
# Orchestrates Chrome (CDP) + optional next start for the P2 e2e suite.
# Usage:
#   yarn pipeline:category-board-e2e          # build if needed, start server+Chrome, run
#   BASE=http://localhost:3000 yarn pipeline:category-board-e2e   # reuse existing server
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3100}"
CDP_PORT="${CDP_PORT:-9222}"
BASE="${BASE:-http://127.0.0.1:${PORT}}"
CDP="${CDP:-http://127.0.0.1:${CDP_PORT}}"
PROFILE="${TMPDIR:-/tmp}/geo-rank-p2-chrome-profile"
STARTED_SERVER=0
STARTED_CHROME=0
SERVER_PID=""
CHROME_PID=""

cleanup() {
  if [[ "$STARTED_CHROME" -eq 1 && -n "${CHROME_PID}" ]]; then
    kill "$CHROME_PID" 2>/dev/null || true
  fi
  if [[ "$STARTED_SERVER" -eq 1 && -n "${SERVER_PID}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

find_chrome() {
  if [[ -n "${CHROME_PATH:-}" && -x "$CHROME_PATH" ]]; then
    echo "$CHROME_PATH"
    return
  fi
  local candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
    "google-chrome"
    "google-chrome-stable"
    "chromium"
    "chromium-browser"
  )
  for c in "${candidates[@]}"; do
    if [[ -x "$c" ]]; then
      echo "$c"
      return
    fi
    if command -v "$c" >/dev/null 2>&1; then
      command -v "$c"
      return
    fi
  done
  echo "Chrome/Chromium not found. Set CHROME_PATH or install Chrome." >&2
  exit 1
}

wait_http() {
  local url="$1"
  local label="$2"
  local i
  for i in $(seq 1 60); do
    if curl -sf -o /dev/null "$url"; then
      return 0
    fi
    sleep 0.5
  done
  echo "timed out waiting for $label at $url" >&2
  exit 1
}

CHROME="$(find_chrome)"

# Reuse an already-listening BASE when the caller pointed at one, otherwise start next.
if curl -sf -o /dev/null "$BASE/category/ai-tools" 2>/dev/null; then
  echo "reusing server at $BASE"
else
  if [[ ! -d .next ]]; then
    echo "no .next build — running yarn build"
    yarn build
  fi
  echo "starting next start on :$PORT"
  npx next start -p "$PORT" >"${TMPDIR:-/tmp}/geo-rank-p2-next.log" 2>&1 &
  SERVER_PID=$!
  STARTED_SERVER=1
  wait_http "$BASE/category/ai-tools" "next start"
fi

if curl -sf -o /dev/null "${CDP}/json/version" 2>/dev/null; then
  echo "reusing Chrome CDP at $CDP"
else
  echo "starting headless Chrome on :$CDP_PORT"
  # Anti-background flags + focus emulation (in the suite) keep React hydrating.
  "$CHROME" \
    --headless=new \
    --remote-debugging-port="$CDP_PORT" \
    --user-data-dir="$PROFILE" \
    --no-first-run \
    --disable-gpu \
    --window-size=1440,900 \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-background-timer-throttling \
    about:blank >"${TMPDIR:-/tmp}/geo-rank-p2-chrome.log" 2>&1 &
  CHROME_PID=$!
  STARTED_CHROME=1
  wait_http "${CDP}/json/version" "Chrome CDP"
fi

echo "running P2 e2e against $BASE"
BASE="$BASE" CDP="$CDP" node "$ROOT/src/scripts/verify-category-board-e2e.mjs"
