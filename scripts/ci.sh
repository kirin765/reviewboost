#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  npm ci
fi

# If .next contains root-owned subdirs (can happen in some environments), Next can't clean it.
# Move it aside so lint/build can recreate it with correct permissions.
if [ -d .next ]; then
  if { [ -d .next/types ] && [ ! -w .next/types ]; } || { [ -d .next/server ] && [ ! -w .next/server ]; } || { [ -d .next/static ] && [ ! -w .next/static ]; }; then
    mv .next "/tmp/reviewboost-next-$(date +%s)"
  fi
fi

npm run lint -- --cache-location /tmp/reviewboost-eslint-cache
npm run build

