#!/bin/bash
# Refreshes Eventify with current Seoul events from Meetup + Luma.
# Runs the crawler LOCALLY on this Mac (the server's automatic crawler stays off),
# fixes categories/prices, saves full-res images locally, uploads them to the VPS.
#
# Started daily by launchd (~/Library/LaunchAgents/me.azbek.eventify-refresh.plist);
# only does real work when the last successful run is 7+ days old.
#   scripts/ops/refresh.sh          # respect the 7-day interval
#   scripts/ops/refresh.sh --force  # run now
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

BACKEND="$(cd "$(dirname "$0")/../.." && pwd)"
# Runtime state (logs, last-success stamp) and downloaded images stay outside the repo.
STATE="$BACKEND/../event-refresh"
IMAGES="$BACKEND/../sample-images"
STAMP="$STATE/last-success"
LOGDIR="$STATE/logs"
LIMIT=40
INTERVAL_DAYS=7
mkdir -p "$LOGDIR"

if [ "${1:-}" != "--force" ] && [ -f "$STAMP" ] && [ -z "$(find "$STAMP" -mtime +$((INTERVAL_DAYS - 1)) 2>/dev/null)" ]; then
	exit 0 # last success is less than 7 days old
fi

LOG="$LOGDIR/refresh-$(date +%F-%H%M).log"
exec >"$LOG" 2>&1
ls -1t "$LOGDIR"/refresh-*.log | tail -n +11 | xargs rm -f # keep the last 10 logs

notify() { osascript -e "display notification \"$1\" with title \"Eventify refresh\"" >/dev/null 2>&1 || true; }
fail() { echo "FAILED: $1"; notify "Failed: $1 (see event-refresh/logs)"; kill "${BATCH_PID:-0}" 2>/dev/null; exit 1; }

echo "== $(date) start"
cd "$BACKEND" || fail "backend folder missing"
ssh -o ConnectTimeout=15 -o BatchMode=yes vps true || fail "cannot reach the server (ssh vps)"
lsof -iTCP:3008 -sTCP:LISTEN >/dev/null && fail "port 3008 already in use"

echo "== build batch"
npx nest build batch >/dev/null || fail "build failed"

echo "== start local batch (crawler on demand only)"
PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" NODE_ENV=production \
	node dist/apps/batch/main >"$LOGDIR/batch-last.log" 2>&1 &
BATCH_PID=$!
for i in $(seq 1 60); do grep -q "successfully started" "$LOGDIR/batch-last.log" 2>/dev/null && break; sleep 2; done
grep -q "successfully started" "$LOGDIR/batch-last.log" || fail "batch did not start"

echo "== crawl (limit $LIMIT per source)"
RESULT=$(curl -s -m 3600 "http://127.0.0.1:3008/web-crawling/events?limit=$LIMIT")
kill "$BATCH_PID" 2>/dev/null; wait "$BATCH_PID" 2>/dev/null
echo "$RESULT" | head -c 600; echo
SAVED=$(echo "$RESULT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["stats"]["saved"])' 2>/dev/null) || fail "crawl returned no stats"

echo "== fix categories / prices"
node scripts/ops/fix-events.js || fail "fix-events failed"

echo "== images: download full-res, upload, point events at local copies"
EVENT_IMAGES_DIR="$IMAGES" node scripts/ops/localize-event-images.js || fail "image download failed"
rsync -a "$IMAGES/uploads/event/" vps:/opt/apps/eventify-backend/uploads/event/ || fail "image upload failed"
EVENT_IMAGES_DIR="$IMAGES" node scripts/ops/localize-event-images.js --apply || fail "image DB update failed"

touch "$STAMP"
echo "== $(date) done, saved $SAVED events"
notify "Done: $SAVED events saved"
