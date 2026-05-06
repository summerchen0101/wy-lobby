#!/bin/sh
# 由 Drone 各 deploy step 呼叫；需先 gcloud auth activate-service-account
# 必要環境變數：
#   BUCKET        - GCS bucket 名稱（不含 gs://）
#   REGION        - 顯示用，us / tw
# 選用環境變數（皆提供時會 purge Cloudflare 入口檔快取）：
#   CF_API_TOKEN  - Cloudflare API Token（具備 Zone Cache Purge 權限）
#   CF_ZONE_ID    - Cloudflare Zone ID
#   SITE_URL      - 站台網址（不含尾端 /），例如 https://lobby.example.com

set -eu

if [ -z "${BUCKET:-}" ]; then
  echo "BUCKET env required" >&2
  exit 1
fi

if [ ! -d dist ]; then
  echo "dist/ not found, did build step run?" >&2
  exit 1
fi

GS="gs://${BUCKET}"

echo "==> [${REGION:-?}] Sync hashed assets (immutable, 1y) → $GS"
gcloud storage rsync -r dist/ "$GS" \
  --cache-control="public,max-age=86400,immutable" \
  --exclude='index\.html|sw\.js|manifest\.webmanifest'

echo "==> [${REGION:-?}] Upload entry files (no-cache)"
for f in index.html sw.js manifest.webmanifest; do
  if [ -f "dist/$f" ]; then
    gcloud storage cp "dist/$f" "$GS/$f" \
      --cache-control="no-cache,max-age=0,must-revalidate"
  fi
done

if [ -n "${CF_API_TOKEN:-}" ] && [ -n "${CF_ZONE_ID:-}" ] && [ -n "${SITE_URL:-}" ]; then
  echo "==> [${REGION:-?}] Purge Cloudflare cache for entry files on $SITE_URL"
  PAYLOAD=$(printf '{"files":["%s/index.html","%s/sw.js","%s/manifest.webmanifest"]}' \
    "$SITE_URL" "$SITE_URL" "$SITE_URL")
  HTTP_CODE=$(curl -sS -o /tmp/cf_purge.json -w "%{http_code}" \
    -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "$PAYLOAD")
  if [ "$HTTP_CODE" != "200" ]; then
    echo "Cloudflare purge failed (HTTP $HTTP_CODE):" >&2
    cat /tmp/cf_purge.json >&2 || true
    exit 1
  fi
  echo "Cloudflare purge OK"
else
  echo "==> [${REGION:-?}] Cloudflare purge skipped (CF_API_TOKEN / CF_ZONE_ID / SITE_URL not all set)"
fi

echo "==> [${REGION:-?}] Done."
