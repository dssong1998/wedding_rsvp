#!/usr/bin/env bash
# layout.dae-da.com — wedding_rsvp nginx + bonelli-layout 연동 진단
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env"
fi

NETWORK="${DOCKER_NETWORK:-deploy_default}"
NGINX_CID="$(docker ps -q -f name=nginx | head -1 || true)"

echo "=== 1) bonelli-layout 컨테이너 ==="
docker ps -a --filter name=bonelli-layout --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true

echo ""
echo "=== 2) Docker network: $NETWORK ==="
if docker network inspect "$NETWORK" >/dev/null 2>&1; then
  docker network inspect "$NETWORK" --format '{{range .Containers}}{{.Name}} {{end}}'
else
  echo "ERROR: network '$NETWORK' 없음"
  echo "  ./scripts/find-nginx-network.sh 로 이름 확인"
fi

echo ""
echo "=== 3) nginx → bonelli-layout (컨테이너 내부) ==="
if [[ -n "$NGINX_CID" ]]; then
  docker exec "$NGINX_CID" nginx -t 2>&1 || true
  echo ""
  if docker exec "$NGINX_CID" test -f /etc/nginx/conf.d/layout.dae-da.com.conf; then
    echo "OK: layout.dae-da.com.conf 마운트됨"
  else
    echo "ERROR: layout.dae-da.com.conf 없음 — wedding_rsvp/deploy 에서 ./deploy.sh 재실행 필요"
  fi
  echo ""
  docker exec "$NGINX_CID" wget -qO- --timeout=5 http://bonelli-layout/ 2>&1 | head -5 || \
    echo "ERROR: nginx → bonelli-layout 연결 실패 (같은 network? 컨테이너 기동?)"
else
  echo "WARN: nginx 컨테이너 없음"
fi

echo ""
echo "=== 4) origin HTTPS (서버 localhost) ==="
curl -skI --resolve layout.dae-da.com:443:127.0.0.1 https://layout.dae-da.com/ 2>&1 | head -8 || \
  echo "ERROR: localhost:443 에 layout server 블록 없음"

echo ""
echo "=== 5) Cloudflare 경유 (외부) ==="
curl -sI --max-time 10 https://layout.dae-da.com/ 2>&1 | head -8 || \
  echo "ERROR: Cloudflare/외부에서 접근 불가 (DNS·SSL·origin 확인)"

echo ""
echo "=== 흔한 Host Error 원인 ==="
echo "  • wedding_rsvp nginx 재기동 안 함 → deploy/ 에서 ./deploy.sh"
echo "  • layout DNS 미등록 또는 프록시 OFF"
echo "  • Cloudflare SSL Flexible 인데 origin 443만 열림 → Full 로 변경"
echo "  • bonelli-layout 이 deploy_default 가 아닌 다른 network"
