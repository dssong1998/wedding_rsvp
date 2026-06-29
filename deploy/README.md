# Deployment Guide (Vultr + Docker Compose)

이 프로젝트는 `web`(Next.js), `api`(NestJS), `postgres`, `nginx`, `certbot`를 Docker Compose로 운영합니다.

## 1) 서버 준비

Ubuntu 22.04/24.04 기준:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"

# Re-login 후 확인
docker --version
docker compose version
```

방화벽:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 2) DNS 준비

아래 A 레코드를 모두 서버 공인 IP로 연결합니다.

- `dae-da.com`
- `www.dae-da.com`
- `api.dae-da.com`

## 3) 코드 배치

```bash
git clone <repo-url> rsvp
cd rsvp
```

## 4) 운영 환경변수 준비

```bash
cp deploy/.env.example deploy/.env
```

`deploy/.env` 필수 항목:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `SESSION_SECRET`
- `CORS_ORIGIN` (프론트 도메인들)
- `NEXT_PUBLIC_API_BASE` (예: `https://api.dae-da.com`)
- `API_BASE` (권장: `http://api:4000`, web 컨테이너 내부 호출용)
- `WEB_DOMAIN`, `WWW_DOMAIN`, `API_DOMAIN`
- `LETSENCRYPT_EMAIL`
- `DISCORD_WEBHOOK_URL`, `DISCORD_OTP_WEBHOOK_URL` (필요 시)

## 5) 최초 인증서 발급 (1회)

실행 권한 부여:

```bash
chmod +x deploy/bootstrap-cert.sh deploy/deploy.sh deploy/healthcheck.sh
```

먼저 Let's Encrypt staging으로 검증:

```bash
cd deploy
./bootstrap-cert.sh --staging
```

정상 동작 확인 후 실발급:

```bash
./bootstrap-cert.sh
```

이 스크립트는 다음을 자동 수행합니다.

1. HTTP-only nginx로 임시 기동
2. certbot으로 인증서 발급
3. TLS nginx 설정으로 전환

인증서 발급 후 앱 컨테이너는 별도로 배포합니다:

```bash
./deploy.sh
```

## 6) 애플리케이션 배포

```bash
cd deploy
./deploy.sh --prune
./deploy.sh
```

최초 1회 시드가 필요하면:

```bash
./deploy.sh --seed
```

## 7) 상태 점검

```bash
cd deploy
./healthcheck.sh
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs -f --tail=200 nginx web api
```

## 8) 업데이트 배포

```bash
cd /path/to/rsvp
git pull
cd deploy
./deploy.sh
```

## 9) 자주 발생하는 이슈

- 인증서 발급 실패:
  - DNS 전파 완료 여부 확인
  - 80/443 포트 오픈 여부 확인
  - `deploy/.env`의 도메인/이메일 값 재확인
- `ENOSPC: no space left on device` / `failed to execute bake: signal: killed`:
  - 디스크 부족 또는 빌드 캐시 과다 상황입니다.
  - `./deploy.sh --prune` 실행 후 다시 `./deploy.sh`
  - 필요하면 서버에 swap 추가 후 재시도
- CORS 오류:
  - `CORS_ORIGIN`에 `https://dae-da.com,https://www.dae-da.com` 포함 확인
- 모바일에서 API 호출 실패:
  - `NEXT_PUBLIC_API_BASE`가 실제 API 도메인인지 확인
  - `API_BASE=http://api:4000` 유지 권장

## 10) 운영 팁

- certbot 자동 갱신 컨테이너는 이미 compose에 포함됨
- 배포 전 점검:
  - `docker compose -f deploy/docker-compose.yml config` 로 문법 확인
  - `./deploy/healthcheck.sh`로 외부 접근 확인
