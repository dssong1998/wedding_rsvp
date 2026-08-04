#!/usr/bin/env bash
# Build and rsync dist/ to layout.dae-da.com server.
# Setup: cp deploy/env.example deploy/env && edit deploy/env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy/env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/env.example to deploy/env and configure." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy/env}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy/env}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH in deploy/env}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"

RSYNC_SSH="${RSYNC_SSH:-ssh -p $DEPLOY_PORT}"

echo "→ npm run build"
cd "$ROOT"
npm run build

echo "→ rsync dist/ → ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"
rsync -avz --delete \
  -e "$RSYNC_SSH" \
  "$ROOT/dist/" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "Done. https://layout.dae-da.com"
