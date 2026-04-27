#!/bin/sh
# 由 Drone 各 deploy step 呼叫；需先 gcloud auth activate-service-account
# 必要環境變數：
#   BUCKET   - GCS bucket 名稱（不含 gs://）
#   URL_MAP  - GCP HTTPS LB 的 URL Map 名稱（給 CDN invalidate）
#   REGION   - 顯示用，us / tw

set -eu

if [ -z "${BUCKET:-}" ] || [ -z "${URL_MAP:-}" ]; then
  echo "BUCKET / URL_MAP env required" >&2
  exit 1
fi

if [ ! -d dist ]; then
  echo "dist/ not found, did build step run?" >&2
  exit 1
fi

GS="gs://${BUCKET}"

echo "==> [${REGION:-?}] Sync hashed assets (immutable, 1y) → $GS"
gcloud storage rsync -r -d dist/ "$GS" \
  --cache-control="public,max-age=31536000,immutable" \
  --exclude='index\.html|sw\.js|manifest\.webmanifest'

echo "==> [${REGION:-?}] Upload entry files (no-cache)"
for f in index.html sw.js manifest.webmanifest; do
  if [ -f "dist/$f" ]; then
    gcloud storage cp "dist/$f" "$GS/$f" \
      --cache-control="no-cache,max-age=0,must-revalidate"
  fi
done

echo "==> [${REGION:-?}] Invalidate CDN for entry paths on $URL_MAP"
for p in /index.html /sw.js /manifest.webmanifest; do
  gcloud compute url-maps invalidate-cdn-cache "$URL_MAP" --path "$p" --async || true
done

echo "==> [${REGION:-?}] Done."
