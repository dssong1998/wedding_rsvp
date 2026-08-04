# Wedding Invite Monorepo

## 앱 구성

- `apps/web`: Next.js 공개 페이지 + 개인 초대 링크 라우트 + 숨김 관리자 UI
- `apps/api`: NestJS + Prisma RSVP API
- `apps/layout`: Vite + React + Phaser 보넬리 가든 레이아웃 에디터 (`layout.dae-da.com`)
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
- Layout: `http://localhost:5173` (`pnpm dev:layout`)

## 라우팅

- `/`: 미초대 공개 페이지 (KO/EN)
- `/invited@{이름}`: 초대장 페이지 (`wedding-invite-2.html` 기반 동일 애니메이션/스타일)
- `/_admin-rsvp-portal`: 관리자 페이지 (Discord OTP)

## 배포

```bash
cp deploy/.env.example deploy/.env
cd deploy && ./deploy.sh --build
```

layout만 배포: `./deploy.sh --build layout` — `layout.dae-da.com`
