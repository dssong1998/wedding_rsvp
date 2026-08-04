#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-standalone}"
FILE="docker-compose.yml"
[[ "$MODE" == "proxy" ]] && FILE="docker-compose.proxy.yml"
cd "$ROOT"
docker compose -f "$FILE" logs -f --tail=100
