#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
dist_dir="$root_dir/dist"
archive="$dist_dir/LiveHeader.zip"

if ! command -v zip >/dev/null 2>&1; then
  printf 'Error: the zip command is required.\n' >&2
  exit 1
fi

for path in manifest.json background.js shared.js popup.js popup.html popup.css _locales icons; do
  if [[ ! -e "$root_dir/$path" ]]; then
    printf 'Error: required package file is missing: %s\n' "$path" >&2
    exit 1
  fi
done

mkdir -p "$dist_dir"
stage_dir="$(mktemp -d)"
archive_tmp_dir="$(mktemp -d "$dist_dir/.LiveHeader.XXXXXX")"
archive_tmp="$archive_tmp_dir/LiveHeader.zip"
cleanup() {
  rm -rf "$stage_dir"
  rm -rf "$archive_tmp_dir"
}
trap cleanup EXIT

cp -R \
  "$root_dir/manifest.json" \
  "$root_dir/background.js" \
  "$root_dir/shared.js" \
  "$root_dir/popup.js" \
  "$root_dir/popup.html" \
  "$root_dir/popup.css" \
  "$root_dir/_locales" \
  "$root_dir/icons" \
  "$stage_dir/"

(
  cd "$stage_dir"
  zip -qr "$archive_tmp" \
    manifest.json background.js shared.js popup.js popup.html popup.css _locales icons
)

mv -f "$archive_tmp" "$archive"
printf 'Created %s\n' "$archive"