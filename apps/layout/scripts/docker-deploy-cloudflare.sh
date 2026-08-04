#!/usr/bin/env bash
# Cloudflare + 기존 Docker nginx 연동 배포
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env — set DOCKER_NETWORK then re-run." >&2
  echo "Hint: ./scripts/find-nginx-network.sh" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/.env"

if [[ -z "${DOCKER_NETWORK:-}" ]]; then
  echo "DOCKER_NETWORK 가 .env 에 없습니다." >&2
  echo "서버에서 ./scripts/find-nginx-network.sh 실행 후 network 이름을 .env 에 넣으세요." >&2
  exit 1
fi

if ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
  echo "Docker network '$DOCKER_NETWORK' 가 없습니다." >&2
  echo "dae-da 웹 스택이 실행 중인지, network 이름이 맞는지 확인하세요." >&2
  exit 1
fi

echo "→ build & up (network: $DOCKER_NETWORK, container: bonelli-layout)"
docker compose -f docker-compose.cloudflare.yml build --pull
docker compose -f docker-compose.cloudflare.yml up -d --remove-orphans

echo ""
docker compose -f docker-compose.cloudflare.yml ps

echo ""
echo "══════════════════════════════════════════════════════════"
echo "✓ bonelli-layout 컨테이너 기동됨 (network: $DOCKER_NETWORK)"
echo ""
echo "wedding_rsvp 스택 사용 시 (deploy/docker-compose.yml):"
echo "  nginx/layout.dae-da.com.conf 가 이미 마운트되어 있으면 reload 만:"
echo "    docker exec \$(docker ps -q -f name=nginx) nginx -t"
echo "    docker exec \$(docker ps -q -f name=nginx) nginx -s reload"
echo ""
echo "  연결 테스트:"
echo "    docker exec \$(docker ps -q -f name=nginx) wget -qO- http://bonelli-layout/ | head"
echo ""
echo "Cloudflare: layout A → 서버 IP, 프록시 ON, SSL/TLS Full"
echo "자세히: deploy/WEDDING-RSVP.md"
echo "══════════════════════════════════════════════════════════"
