#!/usr/bin/env bash
# 호스트 nginx + certbot (proxy 모드용) — 서버에서 root/sudo 로 실행
set -euo pipefail

DOMAIN="${1:-layout.dae-da.com}"
EMAIL="${2:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: sudo $0 [domain] [acme-email]" >&2
  echo "Example: sudo $0 layout.dae-da.com admin@dae-da.com" >&2
  exit 1
fi

if ! command -v certbot >/dev/null; then
  echo "certbot 미설치. Ubuntu: sudo apt install certbot python3-certbot-nginx" >&2
  exit 1
fi

CONF_SRC="$(cd "$(dirname "$0")/.." && pwd)/deploy/nginx-host-proxy.conf"
CONF_DST="/etc/nginx/sites-available/${DOMAIN}"

echo "→ nginx site config: $CONF_DST"
cp "$CONF_SRC" "$CONF_DST"
ln -sf "$CONF_DST" "/etc/nginx/sites-enabled/${DOMAIN}"

echo "→ certbot (nginx plugin)"
certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email

echo "→ nginx test & reload"
nginx -t
systemctl reload nginx

echo "✓ https://${DOMAIN} (proxy → 127.0.0.1:8080)"
