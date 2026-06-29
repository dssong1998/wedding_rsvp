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

# shellcheck disable=SC1091
. "$ENV_FILE"

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
MIN_FREE_KB=3145728
if [ "${AVAIL_KB:-0}" -lt "$MIN_FREE_KB" ] && [ "$DO_PRUNE" -eq 0 ]; then
  echo "ERROR: low disk space (<3GB). Build aborted to avoid ENOSPC."
  echo "Run './deploy.sh --prune' first, or free disk manually."
  exit 1
fi

if [ "$DO_PRUNE" -eq 1 ]; then
  echo "[0/4] Pruning unused Docker cache/images..."
  docker builder prune -af
  docker image prune -af
  docker container prune -f
  AVAIL_KB="$(df -Pk . | awk 'NR==2 { print $4 }')"
  if [ "${AVAIL_KB:-0}" -lt "$MIN_FREE_KB" ]; then
    echo "ERROR: disk space is still low after prune (<3GB)."
    echo "Free additional space, then rerun deploy."
    exit 1
  fi
fi

WEB_DOMAIN="${WEB_DOMAIN:-dae-da.com}"
SSL_PROVIDER="${SSL_PROVIDER:-cloudflare}"
CF_SSL_CERT_DIR="${CF_SSL_CERT_DIR:-/etc/ssl/cloudflare}"
CF_SSL_CERT_FILE="${CF_SSL_CERT_FILE:-${WEB_DOMAIN}.pem}"
CF_SSL_KEY_FILE="${CF_SSL_KEY_FILE:-${WEB_DOMAIN}.key}"

if [ "$SSL_PROVIDER" = "cloudflare" ]; then
  CERT_FULLCHAIN="${CF_SSL_CERT_DIR%/}/${CF_SSL_CERT_FILE}"
  CERT_PRIVKEY="${CF_SSL_CERT_DIR%/}/${CF_SSL_KEY_FILE}"
  if [ ! -f "$CERT_FULLCHAIN" ] || [ ! -f "$CERT_PRIVKEY" ]; then
    echo "ERROR: Cloudflare cert files not found."
    echo "Expected:"
    echo "  ${CERT_FULLCHAIN}"
    echo "  ${CERT_PRIVKEY}"
    exit 1
  fi
elif [ "$SSL_PROVIDER" = "letsencrypt" ]; then
  CERT_FULLCHAIN="${SCRIPT_DIR}/certbot/conf/live/${WEB_DOMAIN}/fullchain.pem"
  CERT_PRIVKEY="${SCRIPT_DIR}/certbot/conf/live/${WEB_DOMAIN}/privkey.pem"
else
  echo "ERROR: Unknown SSL_PROVIDER=${SSL_PROVIDER} (use cloudflare or letsencrypt)"
  exit 1
fi

echo "[1/4] Building web/api images..."
COMPOSE_BAKE=false docker compose --env-file "$ENV_FILE" -f docker-compose.yml build api
COMPOSE_BAKE=false docker compose --env-file "$ENV_FILE" -f docker-compose.yml build web

if [ "$SSL_PROVIDER" = "letsencrypt" ] && { [ ! -f "$CERT_FULLCHAIN" ] || [ ! -f "$CERT_PRIVKEY" ]; }; then
  echo "[2/4] TLS cert not found for ${WEB_DOMAIN}. Starting HTTP bootstrap nginx."
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d --remove-orphans postgres api web
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.bootstrap.yml up -d --no-deps nginx
  echo "Run './bootstrap-cert.sh --staging' then './bootstrap-cert.sh', and rerun './deploy.sh'."
else
  echo "[2/4] Applying updated stack..."
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d --remove-orphans
fi

if [ "$DO_SEED" -eq 1 ]; then
  echo "[3/4] Running seed..."
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml exec -T api pnpm prisma:seed
  echo "[4/4] Done."
else
  echo "[3/4] Skipping seed."
  echo "[4/4] Done."
  echo "Tip: run './deploy.sh --seed' once if this is first deployment."
fi
