# Wedding Invite Monorepo

## 앱 구성

- `apps/web`: Next.js 공개 페이지 + 개인 초대 링크 라우트 + 숨김 관리자 UI
- `apps/api`: NestJS + Prisma RSVP API
- `packages/shared`: 공용 타입
- `deploy`: Docker Compose + Nginx + Certbot

## 로컬 실행

```bash
pnpm install
pnpm --filter api prisma:generate
pnpm --filter api prisma db push
pnpm --filter api prisma:seed
pnpm dev
```

기본 주소:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## 라우팅

- `/`: 미초대 공개 페이지 (KO/EN)
- `/invited@{이름}`: 초대장 페이지 (`wedding-invite-2.html` 기반 동일 애니메이션/스타일)
- `/_admin-rsvp-portal`: 관리자 페이지 (Discord OTP)

## 배포

```bash
cp deploy/.env.example deploy/.env
docker compose -f deploy/docker-compose.yml build web api
docker compose -f deploy/docker-compose.yml up -d
```
