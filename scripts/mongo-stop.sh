#!/usr/bin/env bash
# Stop MongoDB started via `npm run mongo`.
# Usage: npm run mongo:stop
set -euo pipefail

MONGO_DIR="$HOME/mongodb"
DBPATH="$MONGO_DIR/data"

if pgrep -f "[m]ongod --dbpath $DBPATH" >/dev/null 2>&1; then
  pkill -f "[m]ongod --dbpath $DBPATH"
  # wait up to ~10s for the daemon to exit cleanly
  for _ in $(seq 1 20); do
    pgrep -f "[m]ongod --dbpath $DBPATH" >/dev/null 2>&1 || { echo "MongoDB stopped"; exit 0; }
    sleep 0.5
  done
  echo "MongoDB did not stop cleanly — force-killing" >&2
  pkill -9 -f "[m]ongod --dbpath $DBPATH"
  echo "MongoDB force-stopped"
else
  echo "MongoDB is not running"
fi