#!/bin/sh
# Copy newbie tutorial clips from source folder to public/videos/1.mp4–19.mp4.
# Mapping matches newbieVideoTutorialSources.ts CLIP_DEFS.
#
# Usage:
#   sh ./scripts/copy-newbie-tutorial-videos.sh [SOURCE_DIR]
#
# Default SOURCE_DIR: repo root `美版新手教學影片 3`

set -eu

WEB_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$WEB_ROOT/.." && pwd)"
SRC_DIR="${1:-$REPO_ROOT/美版新手教學影片 3}"
DEST_DIR="$WEB_ROOT/public/videos"

if [ ! -d "$SRC_DIR" ]; then
  echo "Source directory not found: $SRC_DIR" >&2
  exit 1
fi

copy_pair() {
  deploy="$1"
  source="$2"
  src_path="$SRC_DIR/$source"
  dest_path="$DEST_DIR/$deploy"
  if [ ! -f "$src_path" ]; then
    echo "Missing source file: $src_path" >&2
    exit 1
  fi
  cp "$src_path" "$dest_path"
  echo "  $source → $deploy"
}

echo "==> Copy newbie tutorial videos"
echo "    from: $SRC_DIR"
echo "    to:   $DEST_DIR"
echo ""

copy_pair "1.mp4" "1_click.mp4"
copy_pair "2.mp4" "1Out.mp4"
copy_pair "3.mp4" "2_click.mp4"
copy_pair "4.mp4" "2Out.mp4"
copy_pair "5.mp4" "3_click.mp4"
copy_pair "6.mp4" "3-1_click.mp4"
copy_pair "7.mp4" "4_click.mp4"
copy_pair "8.mp4" "5_click.mp4"
copy_pair "9.mp4" "5-1_click.mp4"
copy_pair "10.mp4" "6.mp4"
copy_pair "11.mp4" "6_click.mp4"
copy_pair "12.mp4" "7.mp4"
copy_pair "13.mp4" "7_click.mp4"
copy_pair "14.mp4" "8_click.mp4"
copy_pair "15.mp4" "8-1_click.mp4"
copy_pair "16.mp4" "9.mp4"
copy_pair "17.mp4" "9-1_click.mp4"
copy_pair "18.mp4" "10_click.mp4"
copy_pair "19.mp4" "10-1_click.mp4"

echo ""
echo "==> Done (19 clips)"
