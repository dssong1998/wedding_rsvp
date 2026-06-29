#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "Created ${ENV_FILE} from .env.example."
  echo "Fill real values in ${ENV_FILE}, then run this script again."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file is missing: ${ENV_FILE}"
  exit 1
fi

echo "[1/3] Building web/api images..."
COMPOSE_BAKE=false docker compose --env-file "$ENV_FILE" -f docker-compose.yml build api
COMPOSE_BAKE=false docker compose --env-file "$ENV_FILE" -f docker-compose.yml build web

echo "[2/3] Applying updated stack..."
docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d --remove-orphans

if [ "${1:-}" = "--seed" ]; then
  echo "[3/3] Running seed..."
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml exec api node dist/prisma/seed.js
else
  echo "[3/3] Done."
  echo "Tip: run './deploy.sh --seed' once if this is first deployment."
fi
