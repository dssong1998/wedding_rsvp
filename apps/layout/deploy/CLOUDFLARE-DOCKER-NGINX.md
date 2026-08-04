# Cloudflare + 기존 Docker nginx (dae-da.com)

호스트에 nginx/certbot **없음**. 웹 게이트웨이는 **Docker nginx 컨테이너** 하나.

SSL: **Cloudflare** (Flexible 권장) — origin 은 HTTP 만.

---

## 흐름

```
브라우저 ──HTTPS──► Cloudflare ──HTTP──► [Docker nginx] ──► bonelli-layout:80
                                              ▲
                                    layout.dae-da.com server 블록
```

`layout.dae-da.com` 이 메인 홈을 보여주면 → nginx 에 **layout 전용 server_name** 이 없거나 default 로 빠지는 상태. 아래 3단계로 분리.

---

## 1단계 — bonelli-layout 컨테이너 (이 repo, 서버)

```bash
cd bonelli_layout
cp .env.example .env

# nginx 와 같은 Docker network 이름 확인
./scripts/find-nginx-network.sh
# → .env 에 DOCKER_NETWORK=... 입력

npm run docker:cloudflare
```

확인:

```bash
docker ps | grep bonelli-layout
docker exec bonelli-layout wget -qO- http://127.0.0.1/ | head
```

---

## 2단계 — 기존 nginx Docker 에 server 블록 추가 (한 번)

`deploy/nginx-docker-gateway.conf` 내용:

```nginx
server {
    listen 80;
    server_name layout.dae-da.com;

    location / {
        proxy_pass http://bonelli-layout:80;
        ...
    }
}
```

### 방법 A — dae-da docker-compose 에 volume 추가 (권장)

dae-da 웹 스택 `docker-compose.yml` nginx 서비스:

```yaml
services:
  nginx:
    volumes:
      - ./nginx/conf.d/layout.dae-da.com.conf:/etc/nginx/conf.d/layout.dae-da.com.conf:ro
```

파일 내용 = `deploy/nginx-docker-gateway.conf` 복사.

```bash
docker compose up -d nginx
docker exec <nginx-container-name> nginx -t
docker exec <nginx-container-name> nginx -s reload
```

### 방법 B — 실행 중 컨테이너에 직접 복사

```bash
docker cp deploy/nginx-docker-gateway.conf <nginx-container>:/etc/nginx/conf.d/layout.dae-da.com.conf
docker exec <nginx-container> nginx -t && docker exec <nginx-container> nginx -s reload
```

### 연결 테스트 (nginx 컨테이너 내부)

```bash
docker exec <nginx-container> wget -qO- http://bonelli-layout/ | head
```

---

## 3단계 — Cloudflare

| 항목 | 값 |
|------|-----|
| DNS | `layout` A → 서버 IP, **프록시 ON** |
| SSL/TLS | **Flexible** |

---

## 업데이트

```bash
git pull
npm run docker:cloudflare
```

nginx 설정은 바꿀 필요 없음.

---

## 하지 않아도 되는 것

- `sudo cp ... /etc/nginx/sites-available/` (호스트 nginx 없음)
- `certbot`, `host-ssl-init.sh`
- `npm run docker:deploy` (Caddy standalone)
- `.env` 의 `ACME_EMAIL`

---

## 문제 해결

| 증상 | 원인 | 조치 |
|------|------|------|
| layout 이 메인 홈과 동일 | default_server 만 있음 | `server_name layout.dae-da.com` 블록 추가 |
| 502 | network 불일치 | `DOCKER_NETWORK` 를 nginx 와 동일하게 |
| connection refused | bonelli-layout 미기동 | `docker ps`, `npm run docker:cloudflare` |
| nginx: command not found | 호스트에 nginx 없음 | **Docker nginx** 에만 설정 |

network 확인:

```bash
docker network inspect $DOCKER_NETWORK --format '{{range .Containers}}{{.Name}} {{end}}'
# bonelli-layout 와 nginx 둘 다 보여야 함
```
