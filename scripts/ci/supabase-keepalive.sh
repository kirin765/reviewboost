#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "SUPABASE_URL or SUPABASE_ANON_KEY is not set."
  exit 1
fi

BASE_URL="${SUPABASE_URL%/}"
KEEP_TABLES="${SUPABASE_KEEPALIVE_TABLES:-analyses,reviews,profiles,subscriptions}"

IFS=',' read -r -a TABLE_LIST <<< "$KEEP_TABLES"

for table in "${TABLE_LIST[@]}"; do
  TABLE_NAME="${table//[[:space:]]/}"

  if [ -z "$TABLE_NAME" ]; then
    continue
  fi

  echo "Pinging Supabase table: $TABLE_NAME"
  if curl --silent --show-error --fail \
    "$BASE_URL/rest/v1/$TABLE_NAME?select=id&limit=1" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY"; then
    echo "\nSupabase keepalive ping succeeded"
    exit 0
  fi

  echo "Ping failed for $TABLE_NAME"
done

echo "All keepalive table probes failed."
exit 1
