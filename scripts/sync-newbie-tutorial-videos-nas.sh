#!/bin/sh
# Sync newbie tutorial clips to NAS us-game-lobby CDN path.
# Required env: NAS_USER, NAS_HOST, NAS_CDN_VIDEOS_PATH (remote dir ending in /videos)
#
# Play order and click-vs-auto-advance rules: see newbieVideoTutorialSources.ts manifest.
#
# Example:
#   NAS_USER=deploy NAS_HOST=nas01.example.com \
#   NAS_CDN_VIDEOS_PATH=/volume1/web/us-game-lobby/videos \
#   sh ./scripts/sync-newbie-tutorial-videos-nas.sh

set -eu

if [ -z "${NAS_USER:-}" ] || [ -z "${NAS_HOST:-}" ] || [ -z "${NAS_CDN_VIDEOS_PATH:-}" ]; then
  echo "NAS_USER, NAS_HOST, NAS_CDN_VIDEOS_PATH env required" >&2
  exit 1
fi

SRC_DIR="$(cd "$(dirname "$0")/../public/videos" && pwd)"
REMOTE="${NAS_USER}@${NAS_HOST}:${NAS_CDN_VIDEOS_PATH%/}/"

echo "==> Upload 1.mp4–19.mp4 → $REMOTE"
for n in $(seq 1 19); do
  rsync -av "$SRC_DIR/${n}.mp4" "$REMOTE"
done

echo "==> Remove legacy *Out.mp4 on remote"
ssh "${NAS_USER}@${NAS_HOST}" "rm -f ${NAS_CDN_VIDEOS_PATH%/}/*Out.mp4 ${NAS_CDN_VIDEOS_PATH%/}/*out.mp4 ${NAS_CDN_VIDEOS_PATH%/}/*OUT.mp4" || true

echo "==> Done"
