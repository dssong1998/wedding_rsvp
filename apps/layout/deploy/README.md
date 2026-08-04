# layout.dae-da.com — Docker 배포 가이드

Bonelli Layout은 **Docker 한 방**으로 빌드·실행·SSL까지 관리합니다.

| 모드 | 언제 쓰나 | SSL |
|------|-----------|-----|
| **standalone** (기본) | 서버 80/443을 이 앱만 사용 | Caddy + Let's Encrypt **자동** |
| **proxy** | dae-da.com이 이미 80/443 사용 | 호스트 nginx + certbot |

---

## 빠른 시작 (standalone)

```bash
# 1) 서버에 repo clone
git clone <repo> bonelli_layout && cd bonelli_layout

# 2) 환경 변수
cp .env.example .env
# DOMAIN=layout.dae-da.com
# ACME_EMAIL=you@dae-da.com

# 3) DNS: layout → 서버 IP

# 4) 배포
npm run docker:deploy
# 또는: ./scripts/docker-deploy.sh
```

1~2분 후 https://layout.dae-da.com (DNS 전파 + 인증서 발급)

---

## 빠른 시작 (proxy — dae-da.com과 공존)

dae-da.com이 **이미 80/443** 을 쓰는 경우:

```bash
cp .env.example .env   # DOMAIN만 맞으면 됨

# Docker (127.0.0.1:8080)
npm run docker:proxy

# 호스트 nginx + SSL (서버에서 sudo)
sudo ./scripts/host-ssl-init.sh layout.dae-da.com you@dae-da.com
```

`deploy/nginx-host-proxy.conf` 가 `/etc/nginx/sites-available/` 에 설치되고 certbot이 SSL을 발급합니다.

---

## npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run docker:deploy` | standalone — Caddy + auto SSL |
| `npm run docker:proxy` | proxy — HTTP :8080 only |
| `npm run docker:down` | 컨테이너 중지 |
| `npm run docker:logs` | 로그 follow |

---

## 아키텍처

### Standalone
```
Internet → :443/:80 → [Docker: Caddy]
                         ├─ Let's Encrypt (자동 발급/갱신)
                         └─ /srv ← Vite dist (이미지 빌드 시 포함)
```

### Proxy
```
Internet → :443 → [Host nginx + certbot]
                      ↓ proxy_pass
                   127.0.0.1:8080 → [Docker: nginx] → dist/
```

---

## 업데이트 (재배포)

```bash
git pull
npm run docker:deploy    # 또는 docker:proxy
```

이미지 재빌드 + 컨테이너 재기동. 사용자는 Cmd+Shift+R (캐시).

---

## 파일 구조

| 파일 | 용도 |
|------|------|
| `Dockerfile` | node build → Caddy 또는 nginx |
| `docker-compose.yml` | standalone (Caddy, 80/443) |
| `docker-compose.proxy.yml` | proxy (nginx, 127.0.0.1:8080) |
| `.env.example` | DOMAIN, ACME_EMAIL |
| `deploy/Caddyfile` | Caddy + 자동 HTTPS |
| `deploy/nginx-docker.conf` | 컨테이너 내부 nginx |
| `deploy/nginx-host-proxy.conf` | 호스트 nginx SSL 프록시 |
| `scripts/docker-deploy.sh` | 배포 메인 스크립트 |
| `scripts/host-ssl-init.sh` | proxy 모드 SSL 초기화 |

---

## 사전 준비 (체크리스트)

### 공통
- [ ] 서버에 **Docker** + **Docker Compose v2** 설치
- [ ] DNS `layout.dae-da.com` → 서버 공인 IP
- [ ] 방화벽 80, 443 허용 (standalone) 또는 443만 (proxy)

### Standalone 추가
- [ ] **80/443 포트가 다른 서비스와 충돌하지 않음**
- [ ] `.env`에 `ACME_EMAIL` 설정

### Proxy 추가
- [ ] 호스트 **nginx** 설치
- [ ] `certbot` + `python3-certbot-nginx` 설치
- [ ] dae-da.com nginx 설정과 `server_name layout.dae-da.com` 분리

---

## Docker 설치 (Ubuntu 예시)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 재로그인 후
docker compose version
```

---

## 배포 후 확인

- [ ] https://layout.dae-da.com 로드
- [ ] 캠퍼스 맵·편집·동선·신랑/신부 스프라이트
- [ ] 공유 링크 복사·붙여넣기
- [ ] `docker compose ps` — healthy

---

## 문제 해결

| 증상 | 조치 |
|------|------|
| SSL 발급 실패 | DNS 전파 확인, 80 포트 외부 개방, `docker logs bonelli-layout-app-1` |
| port 80 already in use | **proxy 모드** 사용 |
| 502 Bad Gateway (proxy) | `curl http://127.0.0.1:8080` — Docker 컨테이너 기동 확인 |
| 빈 화면 | `docker compose logs`, 이미지 재빌드 |

### SSL 인증서 (standalone)

Caddy가 `/data` 볼륨에 저장·자동 갱신. 수동 확인:

```bash
docker compose exec app caddy list-modules 2>/dev/null || docker compose logs app
```

---

## 레거시: rsync 배포 (Docker 없이)

`scripts/deploy.sh` + `deploy/env.example` — 정적 `dist/` 를 `/var/www/` 에 직접 업로드.  
Docker 사용을 권장합니다.

---

## 프로덕션 참고

- **Node.js 서버 불필요** — 컨테이너는 정적 파일만 서빙
- **배경 preset 저장**: JSON 다운로드만 (dev API 없음)
- preset 변경 → `src/data/presets/` 수정 후 **재배포**
- 이미지 크기: 빌드 컨텍스트 ~12MB dist + 타일셋
