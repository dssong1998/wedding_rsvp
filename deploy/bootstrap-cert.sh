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
  echo "Create it manually, or add ${ENV_EXAMPLE} first and rerun."
  exit 1
fi

# shellcheck disable=SC1091
. "$ENV_FILE"

WEB_DOMAIN="${WEB_DOMAIN:-}"
WWW_DOMAIN="${WWW_DOMAIN:-}"
API_DOMAIN="${API_DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

if [ -z "$WEB_DOMAIN" ] || [ -z "$WWW_DOMAIN" ] || [ -z "$API_DOMAIN" ] || [ -z "$LETSENCRYPT_EMAIL" ]; then
  echo "ERROR: Missing required domain/email values in deploy/.env."
  echo "Required: WEB_DOMAIN, WWW_DOMAIN, API_DOMAIN, LETSENCRYPT_EMAIL"
  exit 1
fi

mkdir -p certbot/conf certbot/www

echo "[1/4] Starting temporary HTTP-only nginx for ACME..."
docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.bootstrap.yml up -d postgres api web nginx

echo "[2/4] Requesting Let's Encrypt certificate..."
if [ "${1:-}" = "--staging" ]; then
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml run --rm certbot \
    certbot certonly --staging --webroot -w /var/www/certbot \
    -d "$WEB_DOMAIN" -d "$WWW_DOMAIN" -d "$API_DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
else
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml run --rm certbot \
    certbot certonly --webroot -w /var/www/certbot \
    -d "$WEB_DOMAIN" -d "$WWW_DOMAIN" -d "$API_DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
fi

echo "[3/4] Starting full stack with TLS nginx config..."
docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d

echo "[4/4] Certificate bootstrap complete."
