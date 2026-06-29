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

DO_SEED=0
DO_PRUNE=0
for arg in "$@"; do
  case "$arg" in
    --seed)
      DO_SEED=1
      ;;
    --prune)
      DO_PRUNE=1
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: ./deploy.sh [--prune] [--seed]"
      exit 1
      ;;
  esac
done

AVAIL_KB="$(df -Pk . | awk 'NR==2 { print $4 }')"
if [ "${AVAIL_KB:-0}" -lt 3145728 ]; then
  echo "WARNING: low disk space (<3GB). ENOSPC may occur during docker build."
  echo "Run './deploy.sh --prune' first, or free disk manually."
fi

if [ "$DO_PRUNE" -eq 1 ]; then
  echo "[0/4] Pruning unused Docker cache/images..."
  docker builder prune -af
  docker image prune -af
  docker container prune -f
fi

echo "[1/4] Building web/api images..."
COMPOSE_BAKE=false docker compose --env-file "$ENV_FILE" -f docker-compose.yml build api
COMPOSE_BAKE=false docker compose --env-file "$ENV_FILE" -f docker-compose.yml build web

echo "[2/4] Applying updated stack..."
docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d --remove-orphans

if [ "$DO_SEED" -eq 1 ]; then
  echo "[3/4] Running seed..."
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml exec api node dist/prisma/seed.js
  echo "[4/4] Done."
else
  echo "[3/4] Skipping seed."
  echo "[4/4] Done."
  echo "Tip: run './deploy.sh --seed' once if this is first deployment."
fi
