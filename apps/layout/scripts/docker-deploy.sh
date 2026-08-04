#!/usr/bin/env bash
# Bonelli Layout — Docker build & deploy
# Usage:
#   ./scripts/docker-deploy.sh           # standalone (Caddy + auto SSL, ports 80/443)
#   ./scripts/docker-deploy.sh proxy     # behind host nginx (127.0.0.1:8080)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-standalone}"

cd "$ROOT"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "→ .env 없음. .env.example 을 복사합니다."
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "   .env 를 편집한 뒤 다시 실행하세요 (DOMAIN, ACME_EMAIL)." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/.env"

if [[ "$MODE" == "standalone" ]]; then
  if [[ -z "${ACME_EMAIL:-}" ]]; then
    echo "standalone 모드: .env 에 ACME_EMAIL 을 설정하세요." >&2
    exit 1
  fi
  echo "→ standalone 배포 (Caddy + Let's Encrypt)"
  echo "   DOMAIN=$DOMAIN"
  echo "   포트 80/443 필요 — dae-da.com과 충돌 시: ./scripts/docker-deploy.sh proxy"
  docker compose -f docker-compose.yml build --pull
  docker compose -f docker-compose.yml up -d --remove-orphans
  COMPOSE_FILE="docker-compose.yml"
elif [[ "$MODE" == "proxy" ]]; then
  echo "→ proxy 배포 (Docker HTTP :8080 → 호스트 nginx SSL)"
  echo "   호스트 nginx: deploy/nginx-host-proxy.conf 참고"
  docker compose -f docker-compose.proxy.yml build --pull
  docker compose -f docker-compose.proxy.yml up -d --remove-orphans
  COMPOSE_FILE="docker-compose.proxy.yml"
else
  echo "Usage: $0 [standalone|proxy]" >&2
  exit 1
fi

echo ""
echo "→ 컨테이너 상태"
docker compose -f "$COMPOSE_FILE" ps

echo ""
if [[ "$MODE" == "standalone" ]]; then
  echo "✓ https://${DOMAIN:-layout.dae-da.com} (DNS 전파 후 SSL 자동 발급, 수십 초 소요)"
else
  echo "✓ Docker: http://127.0.0.1:8080"
  echo "  다음: 호스트 nginx + certbot 설정 → https://${DOMAIN:-layout.dae-da.com}"
fi
