# Bonelli Layout (`layout.dae-da.com`)

Vite + React + Phaser 웨딩장 레이아웃 에디터. wedding_rsvp 모노레포의 `apps/layout`으로 통합되었습니다.

## 로컬 개발

```bash
# repo root
pnpm --filter layout dev
```

http://localhost:5173

## 빌드

```bash
pnpm --filter layout build
```

## 배포

`layout.dae-da.com`은 `deploy/docker-compose.yml`의 `layout` 서비스 + nginx 프록시로 서빙됩니다.

```bash
cd deploy
./deploy.sh --build layout
```

## 프리셋 / 에셋 스크립트

```bash
pnpm --filter layout presets:bake
pnpm --filter layout backgrounds:build
pnpm --filter layout catalog:tiles
```

dev 서버에서만 `POST /api/save-preset` → `src/data/presets/*.json` 저장 가능.
