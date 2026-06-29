#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: deploy/.env file is missing."
  echo "Copy deploy/.env.example to deploy/.env and fill required values first."
  exit 1
fi

# shellcheck disable=SC1091
. ".env"

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
docker compose -f docker-compose.yml -f docker-compose.bootstrap.yml up -d postgres api web nginx

echo "[2/4] Requesting Let's Encrypt certificate..."
if [ "${1:-}" = "--staging" ]; then
  docker compose -f docker-compose.yml run --rm certbot \
    certbot certonly --staging --webroot -w /var/www/certbot \
    -d "$WEB_DOMAIN" -d "$WWW_DOMAIN" -d "$API_DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
else
  docker compose -f docker-compose.yml run --rm certbot \
    certbot certonly --webroot -w /var/www/certbot \
    -d "$WEB_DOMAIN" -d "$WWW_DOMAIN" -d "$API_DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
fi

echo "[3/4] Starting full stack with TLS nginx config..."
docker compose -f docker-compose.yml up -d

echo "[4/4] Certificate bootstrap complete."
