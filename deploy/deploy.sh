#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: deploy/.env file is missing."
  echo "Copy deploy/.env.example to deploy/.env and fill required values first."
  exit 1
fi

echo "[1/3] Building web/api images..."
docker compose -f docker-compose.yml build web api

echo "[2/3] Applying updated stack..."
docker compose -f docker-compose.yml up -d --remove-orphans

if [ "${1:-}" = "--seed" ]; then
  echo "[3/3] Running seed..."
  docker compose -f docker-compose.yml exec api node dist/prisma/seed.js
else
  echo "[3/3] Done."
  echo "Tip: run './deploy.sh --seed' once if this is first deployment."
fi
