#!/usr/bin/env bash
# Start MongoDB (user-space install, no root needed) for local development.
# Usage: npm run mongo
set -euo pipefail

MONGO_DIR="$HOME/mongodb"
DBPATH="$MONGO_DIR/data"
LOGPATH="$MONGO_DIR/log/mongod.log"
PORT="${MONGO_PORT:-27017}"

if [ ! -x "$MONGO_DIR/bin/mongod" ]; then
  echo "mongod not found at $MONGO_DIR/bin/mongod — is MongoDB installed?" >&2
  exit 1
fi

mkdir -p "$DBPATH" "$MONGO_DIR/log"

if pgrep -f "[m]ongod --dbpath $DBPATH" >/dev/null 2>&1; then
  echo "MongoDB already running on port $PORT (bin: $MONGO_DIR/bin/mongod)"
  exit 0
fi

"$MONGO_DIR/bin/mongod" \
  --dbpath "$DBPATH" \
  --logpath "$LOGPATH" \
  --port "$PORT" \
  --bind_ip 127.0.0.1 \
  --fork

echo "MongoDB started on 127.0.0.1:$PORT (log: $LOGPATH)"