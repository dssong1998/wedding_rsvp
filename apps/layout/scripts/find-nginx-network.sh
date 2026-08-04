#!/usr/bin/env bash
# 기존 nginx Docker 컨테이너가 붙어 있는 network 이름 찾기
set -euo pipefail

echo "=== 실행 중인 nginx 컨테이너 ==="
mapfile -t NGINX_IDS < <(docker ps --format '{{.ID}} {{.Names}} {{.Image}}' | grep -i nginx || true)

if [[ ${#NGINX_IDS[@]} -eq 0 ]]; then
  echo "(이름/이미지에 nginx 가 없음 — web, caddy, traefik 등도 확인)"
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
  echo ""
  echo "게이트웨이 컨테이너 이름을 알고 있다면:"
  echo "  docker inspect <컨테이너명> --format '{{range \$k,\$v := .NetworkSettings.Networks}}{{println \$k}}{{end}}'"
  exit 0
fi

for line in "${NGINX_IDS[@]}"; do
  id="${line%% *}"
  rest="${line#* }"
  name="${rest%% *}"
  echo ""
  echo "Container: $name ($id)"
  docker inspect "$id" --format '{{range $k,$v := .NetworkSettings.Networks}}  network: {{$k}}
{{end}}'
done

echo ""
echo "→ .env 에 설정:"
echo "  DOCKER_NETWORK=<위 network 이름 중 dae-da 스택과 같은 것>"
echo ""
echo "예: DOCKER_NETWORK=dae-da_default"
