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
SSL_PROVIDER="${SSL_PROVIDER:-cloudflare}"
CF_SSL_CERT_DIR="${CF_SSL_CERT_DIR:-/etc/ssl/cloudflare}"
CF_SSL_CERT_FILE="${CF_SSL_CERT_FILE:-${WEB_DOMAIN}.pem}"
CF_SSL_KEY_FILE="${CF_SSL_KEY_FILE:-${WEB_DOMAIN}.key}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

if [ -z "$WEB_DOMAIN" ] || [ -z "$WWW_DOMAIN" ] || [ -z "$API_DOMAIN" ]; then
  echo "ERROR: Missing required domain values in deploy/.env."
  echo "Required: WEB_DOMAIN, WWW_DOMAIN, API_DOMAIN"
  exit 1
fi

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

  echo "SSL_PROVIDER=cloudflare detected. No certbot step required."
  echo "Switching nginx to TLS config..."
  docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d --no-deps nginx
  echo "Done. Next step: run ./deploy.sh"
  exit 0
fi

if [ "$SSL_PROVIDER" != "letsencrypt" ]; then
  echo "ERROR: Unknown SSL_PROVIDER=${SSL_PROVIDER} (use cloudflare or letsencrypt)"
  exit 1
fi

if [ -z "$LETSENCRYPT_EMAIL" ]; then
  echo "ERROR: LETSENCRYPT_EMAIL is required when SSL_PROVIDER=letsencrypt."
  exit 1
fi

mkdir -p certbot/conf certbot/www

echo "[1/4] Starting temporary HTTP-only nginx for ACME..."
docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.bootstrap.yml up -d --no-deps nginx

echo "[2/4] Requesting Let's Encrypt certificate..."
if [ "${1:-}" = "--staging" ]; then
  docker compose --profile letsencrypt --env-file "$ENV_FILE" -f docker-compose.yml run --rm --entrypoint certbot certbot \
    certonly --non-interactive --staging --webroot -w /var/www/certbot \
    -d "$WEB_DOMAIN" -d "$WWW_DOMAIN" -d "$API_DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
else
  docker compose --profile letsencrypt --env-file "$ENV_FILE" -f docker-compose.yml run --rm --entrypoint certbot certbot \
    certonly --non-interactive --webroot -w /var/www/certbot \
    -d "$WEB_DOMAIN" -d "$WWW_DOMAIN" -d "$API_DOMAIN" \
    --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
fi

echo "[3/4] Switching nginx to TLS config..."
docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d --no-deps nginx

echo "[4/4] Certificate bootstrap complete."
echo "Next step: run ./deploy.sh to build and start web/api."
