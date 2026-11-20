#!/usr/bin/env bash
# Builds the static GitHub Pages demo into ./out.
# Static export cannot contain API routes, so they are moved aside for the build.
set -euo pipefail
cd "$(dirname "$0")/.."

stash="$(mktemp -d)"
restore() { [ -d "$stash/api" ] && mv "$stash/api" src/app/api; rmdir "$stash" 2>/dev/null || true; }
trap restore EXIT

mv src/app/api "$stash/api"
rm -rf .next out
STATIC_DEMO=1 PAGES_BASE_PATH="${PAGES_BASE_PATH:-}" npx next build
# Keep GitHub Pages from running Jekyll, which would drop the _next directory.
touch out/.nojekyll
