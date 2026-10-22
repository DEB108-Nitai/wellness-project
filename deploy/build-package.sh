#!/bin/bash
# Builds the update package for the live site from the current commit (DEPLOY.md §8).
# Run on a developer machine from the repository root (Git Bash on Windows):  bash deploy/build-package.sh
# Output: build/transenigma-update.tar.gz, which deploy/update-site.sh installs on the server.
# Only files tracked by git go in (git archive), so local secrets (config.local.php, .env*) can never be included.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "STOP: uncommitted changes. Commit (or stash) first, so the package matches a commit."; exit 1; }
BRANCH=$(git branch --show-current)
[ "$BRANCH" = "main" ] || echo "NOTE: building from '$BRANCH', not main."

echo "1. Building the frontend"
npm run build > /dev/null

echo "2. Assembling build/transenigma.com"
OUT=build/transenigma.com
rm -rf "$OUT"
mkdir -p "$OUT"
cp -a dist/. "$OUT/"
git archive HEAD api database/migrations | tar -x -C "$OUT"
rm -rf "$OUT/api/tests"

echo "3. Checking"
bad=$(find "$OUT" \( -name 'config.local*' -o -name '.env*' -o -path '*/api/tests*' -o -path '*/storage/*' ! -name '.gitkeep' ! -name '.htaccess' \) -type f | head -5)
[ -z "$bad" ] || { echo "STOP: files that must not be uploaded:"; echo "$bad"; exit 1; }
[ -f "$OUT/index.html" ] && [ -f "$OUT/.htaccess" ] && [ -f "$OUT/api/index.php" ] || { echo "STOP: the package is incomplete."; exit 1; }

echo "4. Packing"
rm -f build/transenigma-update.tar.gz
tar -czf build/transenigma-update.tar.gz -C "$OUT" .
echo
echo "DONE: build/transenigma-update.tar.gz ($(git rev-parse --short HEAD), $(find "$OUT" -type f | wc -l) files)"
echo "Next: scp it to the server's home folder, then run:  ssh <user>@transenigma.com \"bash ~/update-site.sh\""
