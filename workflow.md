# 청첩장 프로토타입 → 프로덕션 전환 Workflow (확정본)

> 단일 HTML 프로토타입(`wedding-invite-2.html`)을 **Next.js + NestJS + PostgreSQL/Prisma**로 전환.
> 도메인: **daeseokdain.com** · 자체 **Vultr 서버** 호스팅 · 비영리/개인용.

---

## 0. 확정 사항 요약 (Q&A 반영)

| # | 결정 |
|---|---|
| Q1 | **폰 목업 제거.** 콘텐츠가 실제 모바일 뷰포트를 그대로 채움. CSS 강제 회전 없음. 가로 기준 설계 → 폰을 가로로 돌리면 정상 표시. |
| Q2 | **두 가지 진입**: `…/invited@{이름}` = 초대장(이름 파싱→하객 매칭→RSVP 프리필). 그 외 모든 route는 `/`로 redirect → **미초대 공개 페이지**(사진·축의금·편지만, 결혼식 정보 제외, 세로 스크롤). |
| Q3 | **동반인 = 본인 포함 총 확보 좌석 수.** RSVP에서 "ㅇㅇ님 이름으로 N석 확보" 안내. headcount ≤ seats. |
| Q4 | `guests.csv` 제공됨(`순번,이름,동반인`). 동명이인은 **seed에서 검증**. |
| Q5 | 추가 갤러리 없음. `public`에 **mockup 이미지**만 두고 동일 파일명으로 실사진 replace. |
| Q6 | 폰트는 **Helvetica 단일**(시스템 스택). |
| Q7 | **Vultr 단일 서버** 자체 호스팅, 도메인 **daeseokdain.com**. |
| Q8 | RSVP 제출 시 **Discord 웹훅 알림**(카카오 포기), **실시간 누적 참석 인원** 포함. 관리자 OTP도 Discord 사용. |
| Q9 | **관리자 페이지**(응답 목록 + 실시간 참석 수). **Discord OTP** 인증(카카오 포기). **숨김 URL**(프론트 버튼 없음). |
| Q10 | 현재 HTML이 콘텐츠 최종 + **지도/오시는길·축의금 계좌를 추가 포함**. |
| Q11 | 개인정보 처리방침/동의 **생략**(실데이터 민감처리 없음·비영리). |
| Q12 | RSVP **재제출 = overwrite**, 언제든 다시 열어 수정 가능. |
| Q13 | 초대장은 **한국어만**. 미초대 공개 페이지는 **한국어+영어**. |

---

## 1. 라우팅 & 두 가지 경험 (핵심 설계)

```
daeseokdain.com/invited@김민준   ──▶  [초대장]  이름 파싱 → 하객 매칭 → RSVP 프리필 (KO)
daeseokdain.com/                 ──▶  [공개 페이지] 사진 + 축의금 + 편지 (KO/EN, 세로 스크롤)
daeseokdain.com/(그 외 무엇이든)  ──▶  301/308 redirect → "/"
```

### 1.1 초대 링크 파싱
- 경로 형태: `/invited@{한글이름}` (한글은 URL 인코딩됨 → Next.js가 디코딩).
- 처리: `@` 뒤 토큰을 이름으로 추출 → `GET https://api.daeseokdain.com/guests/lookup?name=…` 조회.
  - **매칭 성공** → 초대장(landscape deck) 진입, RSVP에 이름 프리필.
  - **동명이인 방지** → seed 단계에서 이름 중복을 허용하지 않음(중복 시 seed 실패).
  - **미등록 이름** → `/`로 redirect(결혼식 정보 보호).
- 구현(App Router): `app/[invite]/page.tsx`(catch dynamic) 에서 `params.invite`가 `invited@…` 패턴이면 위 로직, 아니면 `redirect('/')`.
  - 주의: 폴더명에 `@`는 병렬 라우트로 해석되므로 **폴더명에 쓰지 말 것**. URL 값(동적 세그먼트 값)으로만 다룬다.
- 보안 수준: 이름을 아는 사람만 결혼식 정보 노출(obscurity 기반). 비영리/개인용으로 충분(Q11).

### 1.2 미초대 공개 페이지(`/`)
- **세로 스크롤** 단일 페이지. **결혼식 일시/장소/타임라인/RSVP 제외**.
- 포함: 대표 사진(들), **축의금 계좌 정보**, **편지(인사말)**.
- **i18n KO/EN**(언어 토글). next-intl 또는 간단한 KO/EN 사전.

---

## 2. 모노레포 / 저장소 구조

```
wedding-invite/                 # pnpm + Turborepo
├─ apps/
│  ├─ web/                      # Next.js(App Router, TS, Tailwind)
│  │  ├─ app/
│  │  │  ├─ page.tsx            # "/" 미초대 공개 페이지 (KO/EN)
│  │  │  ├─ [invite]/page.tsx   # "/invited@이름" 초대장 + 그 외 redirect
│  │  │  └─ <secret>/admin/...  # 숨김 관리자(아래 §6)
│  │  ├─ components/            # Envelope, Deck, Timeline, RsvpForm, PublicPage ...
│  │  ├─ lib/                   # api client, i18n
│  │  └─ public/{images,fonts}/
│  └─ api/                      # NestJS(TS)
│     ├─ src/{guests,rsvp,admin,notify,prisma}/
│     ├─ prisma/{schema.prisma, seed.ts, migrations/}
│     └─ data/guests.csv
├─ packages/shared/             # 공유 타입 + zod DTO
├─ deploy/                      # Vultr: docker-compose, nginx, scripts
│  ├─ docker-compose.yml
│  └─ nginx/daeseokdain.conf
└─ turbo.json
```

---

## 3. 데이터 모델 (Prisma)

```prisma
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

model Guest {
  id          Int      @id @default(autoincrement())
  seq         Int?                          // CSV 순번(참고용)
  name        String                        // 이름
  seats       Int      @default(1)          // 동반인=본인 포함 총 확보 좌석
  rsvp        Rsvp?
  createdAt   DateTime @default(now())

  @@unique([name])                          // 이름 단일 유니크
}

model Rsvp {                                // 재제출=overwrite (Q12)
  id             Int      @id @default(autoincrement())
  guest          Guest    @relation(fields: [guestId], references: [id])
  guestId        Int      @unique           // 하객당 1행, upsert로 덮어쓰기
  weddingAttend  Boolean
  afterAttend    Boolean
  headcount      Int      @default(1)        // 1 ≤ headcount ≤ Guest.seats
  contactPhone   String?
  addrZip        String?
  addrRoad       String
  addrDetail     String?
  updatedAt      DateTime @updatedAt
  createdAt      DateTime @default(now())
}
```

> 참석 통계: `headcount` 합(weddingAttend=true 기준) = 실시간 누적 참석 인원.

---

## 4. DB Seed (제공된 CSV 기준)

### 4.1 실제 CSV 형식
- 파일: `apps/api/data/guests.csv` (UTF-8, **CRLF**, 후행 빈 칼럼 존재)
```csv
순번,이름,동반인
1,김민준,5
2,조성희,3
```
- 컬럼 매핑: `이름→name`, `동반인→seats`(본인 포함 총 좌석), `순번→seq`.
- 파서 주의: **헤더 한글**, **후행 빈 칼럼 무시**, **CRLF/BOM 허용**.

### 4.2 seed.ts 동작
1. CSV 파싱(`csv-parse`) → 빈 행/빈 칼럼 제거.
2. `seats` 정수 검증(≥1).
3. **동명이인 검증**: 같은 `name`이 2건↑이면 **seed 실패(에러 출력)**.
4. `prisma.guest.upsert`(`@@unique[name]`) → **재실행 안전(idempotent)**.

실행: `pnpm --filter api prisma:seed`.

---

## 5. 백엔드 (NestJS)

> Base URL: **`https://api.daeseokdain.com`** (API는 서브도메인 분리 — NestJS 전역 prefix 미사용, 라우트는 루트부터).

| Method | Path | 역할 |
|---|---|---|
| `GET`  | `/guests/lookup?name=` | 초대 링크/RSVP 하객 식별(`status: ok|not_found`, `seats`) |
| `POST` | `/rsvp` | 응답 **upsert**(overwrite). 서버에서 `headcount ≤ seats` 재검증 → 저장 후 **알림 발송**(§7) |
| `GET`  | `/rsvp/me?name=` | 재제출용 기존 응답 프리필 |
| `GET`  | `/admin/stats` | (보호) 실시간 누적 참석 인원/응답 수 |
| `GET`  | `/admin/rsvps` | (보호) 응답 목록 |
| `POST` | `/admin/otp/request` `/admin/otp/verify` | (보호) Discord OTP 발급/검증 |

- 검증: zod/`class-validator` + `ValidationPipe`, 서버측 좌석 재검증.
- 보호: `@nestjs/throttler` 레이트리밋, CORS(아래 §5-A), Helmet.

### 5-A. CORS 처리 (서브도메인 분리 구성)
- **구성**: 프론트 `https://daeseokdain.com` ↔ API `https://api.daeseokdain.com` → **교차 출처(cross-origin)**. CORS를 명시적으로 설정해야 함.
- **허용 출처(Origin) 화이트리스트**: 프로덕션 `https://daeseokdain.com`(+ 필요 시 `https://www.daeseokdain.com`), 개발 `http://localhost:3000`.
- NestJS 설정:
```ts
// apps/api/src/main.ts
app.enableCors({
  origin: (process.env.CORS_ORIGIN ??
           "https://daeseokdain.com,http://localhost:3000").split(","),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,            // 관리자 OTP 세션 쿠키 전송 허용
  maxAge: 86400,                // preflight(OPTIONS) 캐시 24h
});
```
- **Preflight**: 교차 출처 + `Content-Type: application/json`(또는 커스텀 헤더) 요청은 브라우저가 `OPTIONS`를 먼저 보냄 → 위 설정으로 자동 응답(NestJS가 처리). `OPTIONS`를 methods에 포함.
- **자격증명(쿠키) — 관리자 세션**: 교차 출처로 쿠키를 주고받으므로
  - 서버 응답: `Access-Control-Allow-Credentials: true`(위 `credentials:true`) + 와일드카드(`*`) origin **금지**(정확한 출처만).
  - 쿠키 속성: **`SameSite=None; Secure; HttpOnly`**(서브도메인 간 전송 필수). 필요 시 `Domain=.daeseokdain.com`으로 상위도메인 공유.
  - 프론트 fetch: `credentials: "include"`.
- **Nginx 레벨**: api 서버 블록은 **CORS 헤더를 추가/덮어쓰지 않음**(NestJS가 단독 생성 → 중복 `Access-Control-Allow-Origin` 방지). 단, 큰 preflight를 위해 `OPTIONS`도 그대로 api로 프록시.
- **프론트 호출 기준**: `NEXT_PUBLIC_API_BASE=https://api.daeseokdain.com` (빌드타임 인라인 — §10-4 Dockerfile 참고).

---

## 6. 관리자 페이지 (Q9)

- **숨김 URL**: 추측 어려운 secret 경로(예: `/_admin-<random>`) 사용, **프론트 어디에도 링크/버튼 없음**.
- **인증 = Discord OTP**(카카오 포기):
  1. `/otp/request` → 서버가 6자리 코드 생성·세션에 임시 저장 + **관리자 전용 Discord 채널(웹훅)로 코드 전송**.
  2. 관리자가 Discord에서 코드 확인 → 입력 → `/otp/verify` → 검증 성공 시 세션/쿠키 발급(만료시간 부여).
  3. 알림용 웹훅과 **분리된** OTP 전용 비공개 채널 권장(코드 노출 방지). 환경변수 `DISCORD_OTP_WEBHOOK_URL`.
  4. 코드 만료(예: 5분)·시도 횟수 제한·레이트리밋 적용.
- 화면: 응답 목록(이름/참석/애프터/인원/주소/수정시각), **실시간 누적 참석 인원**, CSV 내보내기(옵션).

---

## 7. 알림 (Q8)

- RSVP 저장 시 **Discord Webhook 알림** 발송 + **현재 누적 참석 인원** 동봉.
- 예: "김민준님 결혼식 참석(3명)/애프터 참석 · 현재 누적 42명".
- 환경변수: `DISCORD_WEBHOOK_URL`(알림용). 발송 실패는 비차단(로그만).
- 동일 Discord로 **관리자 OTP**도 사용(§6) — 단, OTP는 비공개 채널 별도 웹훅 권장.

---

## 8. 프론트엔드 전환

### 8.1 폰 목업 제거 / 반응형 (Q1)
- `#device` 목업 프레임 삭제 → **deck가 실제 뷰포트(100dvw×100dvh)를 직접 채움**.
- `cqh/cqw`(container query) 기준을 **뷰포트(`dvh/dvw`) 또는 루트 컨테이너**로 치환.
- **CSS 강제 회전(rotate) 제거**(land↔port transform 삭제). 가로 기준 레이아웃 유지 → 사용자가 폰을 가로로 돌리면 정상 표시.
- 세로(portrait) 진입 시: "가로로 돌려주세요" 안내 오버레이(자동 회전 X). (택1: 안내만 / 축소 letterbox)

### 8.2 컴포넌트 매핑
| 프로토 | 컴포넌트 |
|---|---|
| envelope-stage/플랩 열림 | `<EnvelopeIntro/>` (client, useRef/useEffect) |
| deck/스와이프 | `<InvitationDeck/>` |
| 인사말·예식안내·타임라인 | `<Greeting/>`,`<Details/>`,`<Timeline/>` |
| RSVP 이름확인/참석정보 | `<RsvpName/>`,`<RsvpForm/>` |
| **추가**(Q10) 지도/축의금 | `<MapDirections/>`(네이버맵 임베드), `<GiftAccounts/>`(계좌) |
| 미초대 공개 페이지 | `<PublicPage/>` (KO/EN, 세로 스크롤) |

- 명령형 JS(`openCover/enterReply/selectTl/identifyGuest/submitRsvp`)는 client 컴포넌트로 포팅.
- `identifyGuest`→`/guests/lookup`, `submitRsvp`→`/rsvp`. URL 이름 프리필 연동.

### 8.3 폰트 (Q6)
- **Helvetica 단일**: `font-family:"Helvetica Neue",Helvetica,Arial,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;`
- 참고: Helvetica는 Google Fonts에 호스팅되지 않음(시스템 폰트). 동일 메트릭 웹폰트가 필요하면 `Arimo`(구글) 대체 가능. 별도 라이선스 폰트는 사용 안 함.

---

## 9. 에셋 (`public/`) — mockup 후 replace (Q5)

| 키 | 파일명(제안) | 용도 |
|---|---|---|
| 배경 | `public/images/bg-forest.jpg` | 숲 배경 |
| 사진1 | `public/images/photo-greeting.jpg` | 인사말 사진 |
| 사진2 | `public/images/photo-details.jpg` | 예식안내 사진 |
| 공개 | `public/images/public-*.jpg` | 공개 페이지용 사진 |

- base64 인라인 → 위 파일로 분리, 코드에서 경로 상수 참조(`next/image` 권장).
- 동일 파일명의 **mockup(플레이스홀더)** 커밋 → 실사진으로 덮어쓰면 교체 완료.

---

## 10. 배포 — Vultr 단일 서버 (Q7)

```
            ┌─ daeseokdain.com      :80/:443 → Nginx → web (Next.js, :3000)
Nginx (TLS) ┤
            └─ api.daeseokdain.com  :80/:443 → Nginx → api (NestJS, :4000)
   (양 도메인 모두 /.well-known/acme-challenge/ → certbot webroot)
                                    api ──Prisma──▶ postgres (:5432, named volume)
```

> 모두 **Docker Compose 단일 스택**으로 구동. 컨테이너: `web`, `api`, `postgres`, `nginx`, `certbot`.

### 10-1. `deploy/` 디렉터리 구성 (미리 준비)
```
deploy/
├─ docker-compose.yml
├─ .env                      # 운영 비밀값 (git 제외)
├─ nginx/
│  └─ daeseokdain.conf       # 리버스 프록시 + TLS + ACME
└─ certbot/                  # certbot이 사용하는 볼륨 마운트 위치
   ├─ conf/                  # /etc/letsencrypt (인증서 저장)
   └─ www/                   # webroot (ACME challenge)
```

### 10-2. `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes: [ "pgdata:/var/lib/postgresql/data" ]

  api:
    build: { context: .., dockerfile: apps/api/Dockerfile }
    restart: always
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    depends_on: [ postgres ]
    expose: [ "4000" ]

  web:
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
      args:
        # NEXT_PUBLIC_* 는 next build 시점에 번들로 인라인됨 → 반드시 build arg로 전달
        NEXT_PUBLIC_API_BASE: https://api.daeseokdain.com
    restart: always
    depends_on: [ api ]
    expose: [ "3000" ]

  nginx:
    image: nginx:alpine
    restart: always
    ports: [ "80:80", "443:443" ]
    volumes:
      - ./nginx/daeseokdain.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on: [ web, api ]

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    # 자동 갱신: 12시간마다 갱신 시도 후 nginx reload는 호스트 cron으로
    entrypoint: >
      sh -c 'trap exit TERM;
      while :; do certbot renew --webroot -w /var/www/certbot --quiet;
      sleep 12h & wait $${!}; done'

volumes:
  pgdata:
```

### 10-3. `nginx/daeseokdain.conf`
```nginx
# ── HTTP(80): 두 도메인 모두 ACME 통과 + HTTPS 리다이렉트 ──
server {
    listen 80;
    server_name daeseokdain.com www.daeseokdain.com api.daeseokdain.com;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

# ── HTTPS: 프론트 (daeseokdain.com) → web ──
server {
    listen 443 ssl;
    http2 on;
    server_name daeseokdain.com www.daeseokdain.com;

    ssl_certificate     /etc/letsencrypt/live/daeseokdain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/daeseokdain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ── HTTPS: API (api.daeseokdain.com) → api (NestJS, prefix 없음) ──
server {
    listen 443 ssl;
    http2 on;
    server_name api.daeseokdain.com;

    # 단일 SAN 인증서(daeseokdain.com 발급분에 api.* 포함) 사용
    ssl_certificate     /etc/letsencrypt/live/daeseokdain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/daeseokdain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # CORS 헤더는 NestJS가 단독 생성(여기서 add_header 금지 → 중복 방지).
    # OPTIONS(preflight) 포함 모든 요청을 그대로 api로 전달.
    location / {
        proxy_pass http://api:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
> 주의: 인증서 발급 **전에는** `ssl_certificate` 경로가 없어 nginx가 기동 실패한다 → 10-5의 부트스트랩 순서를 따른다(먼저 80포트만 띄워 발급 후 443 활성화). 한 장의 인증서로 `daeseokdain.com`·`www`·`api`를 모두 커버한다(멀티 SAN).

### 10-4. Dockerfile 개요
- **web** (`apps/web/Dockerfile`): Node 20 멀티스테이지, `next build` → **standalone**(`output:'standalone'`), `EXPOSE 3000`.
  - ⚠️ `NEXT_PUBLIC_API_BASE`는 **빌드 시점에 번들로 인라인**되므로 런타임 env가 아니라 **build ARG**로 받아야 한다:
```dockerfile
# apps/web/Dockerfile (build 스테이지 발췌)
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
RUN pnpm --filter web build      # 이 시점에 api.daeseokdain.com 이 번들에 박힘
```
  - compose의 `web.build.args.NEXT_PUBLIC_API_BASE=https://api.daeseokdain.com`(§10-2)와 연결. 값을 바꾸면 **web 이미지 재빌드** 필요.
- **api** (`apps/api/Dockerfile`): Node 20 멀티스테이지, `nest build` + `prisma generate`. 컨테이너 시작 시 `prisma migrate deploy` 후 `node dist/main`. `EXPOSE 4000`.
  - 서브도메인 분리이므로 **전역 prefix 미설정**(`app.setGlobalPrefix` 사용 안 함) → 라우트는 `/guests/...`, `/rsvp`, `/admin/...`.

### 10-5. Let's Encrypt 최초 발급 (1회)
```bash
# 0) DNS A레코드 → Vultr IP: daeseokdain.com, www.daeseokdain.com, api.daeseokdain.com
#    방화벽 80/443 오픈
# 1) certbot 볼륨 디렉터리 생성
mkdir -p deploy/certbot/conf deploy/certbot/www

# 2) 먼저 web/api/nginx만 기동 (nginx는 80포트·ACME challenge만 사용하도록
#    임시로 443 server 블록을 주석 처리하거나, HTTP 전용 conf로 시작)
docker compose -f deploy/docker-compose.yml up -d nginx web api

# 3) 인증서 발급 — 세 도메인을 한 장(멀티 SAN)으로 (staging 먼저: --staging)
docker compose -f deploy/docker-compose.yml run --rm certbot \
  certbot certonly --webroot -w /var/www/certbot \
  -d daeseokdain.com -d www.daeseokdain.com -d api.daeseokdain.com \
  --email <admin@example.com> --agree-tos --no-eff-email

# 4) 발급 성공 후 443 server 블록 활성화 → nginx 재기동
docker compose -f deploy/docker-compose.yml up -d
```
- **자동 갱신**: `certbot` 컨테이너가 12h마다 `renew` 시도. 갱신 후 nginx 반영은 호스트 cron으로
  `0 4 * * * docker compose -f /…/deploy/docker-compose.yml exec nginx nginx -s reload` 등록.

### 10-6. 운영 `.env` (예시 — git 제외)
```
POSTGRES_USER=wedding
POSTGRES_PASSWORD=<강력한 비밀번호>
POSTGRES_DB=wedding
DATABASE_URL=postgresql://wedding:<pw>@postgres:5432/wedding
PORT=4000
CORS_ORIGIN=https://daeseokdain.com,https://www.daeseokdain.com
DISCORD_WEBHOOK_URL=<알림용 웹훅>
DISCORD_OTP_WEBHOOK_URL=<관리자 OTP 전용 비공개 채널 웹훅>
SESSION_SECRET=<랜덤 시크릿>
# web은 빌드 ARG로 주입(런타임 env 아님): NEXT_PUBLIC_API_BASE=https://api.daeseokdain.com
```

### 10-7. 배포(업데이트) 흐름
```bash
git pull
docker compose -f deploy/docker-compose.yml build web api
docker compose -f deploy/docker-compose.yml up -d        # api 시작 시 migrate deploy 자동
# 최초 1회 시드:
docker compose -f deploy/docker-compose.yml exec api node dist/prisma/seed.js
```

### 10-8. 사전 준비 체크리스트 (배포 전)
- [ ] Vultr 인스턴스(Ubuntu) + Docker/Compose 설치
- [ ] DNS A레코드(daeseokdain.com, www, **api**) → 서버 IP, 방화벽 80/443
- [ ] `deploy/` 5개 항목(compose, .env, nginx conf, certbot/conf, certbot/www) 배치
- [ ] `apps/web/Dockerfile`, `apps/api/Dockerfile`, `next.config`(standalone) 준비
- [ ] Discord 웹훅 2개(알림용/OTP용) 생성 → `.env`
- [ ] Let's Encrypt staging로 1회 테스트 후 prod 발급

### 10-A. Discord OTP 메모
- 별도 준비물 없음. Discord 서버에 **비공개 OTP 채널**을 만들고 웹훅 URL을 `DISCORD_OTP_WEBHOOK_URL`로 설정.
- 알림용 채널/웹훅(`DISCORD_WEBHOOK_URL`)과 분리 권장.

---

## 11. 작업 순서 (체크리스트)

- [ ] **P0** 모노레포·web(Next+Tailwind)·api(Nest)·docker postgres 스캐폴딩
- [ ] **P1** Prisma 스키마 → `migrate dev`
- [ ] **P2** `guests.csv` seed(한글헤더/CRLF/동명이인 검증)
- [ ] **P3** API: guests/lookup, rsvp upsert, rsvp/me, 검증/레이트리밋
- [ ] **P4** 알림(Discord webhook) + 누적 참석 집계
- [ ] **P5** 라우팅: `/invited@이름` 파싱 + 기타 → `/` redirect
- [ ] **P6** 초대장 FE: 목업 제거·반응형(회전 안내)·deck/봉투/타임라인 포팅
- [ ] **P7** RSVP FE: URL 프리필·lookup/submit·재제출(overwrite)
- [ ] **P8** 추가 콘텐츠: 지도/축의금(초대장), 공개 페이지(사진·축의금·편지, KO/EN)
- [ ] **P9** 관리자: 숨김 URL + Discord OTP + 응답목록/실시간 참석수
- [ ] **P10** 에셋 분리(mockup) + Helvetica 통일
- [ ] **P11** QA: 동명이인/미등록/좌석초과/재제출/redirect/가로·세로/크로스브라우저
- [ ] **P12** Vultr 배포(§10): docker-compose·nginx·Let's Encrypt(부트스트랩 발급)·DNS·migrate·seed
- [ ] **P13** 실데이터·실사진 replace

---

## 12. 콘텐츠 데이터 (확정값)

### 12.1 축의금 계좌 (`<GiftAccounts/>` · 공개 페이지)
| 구분 | 은행 | 계좌번호 | 예금주 |
|---|---|---|---|
| 신랑측 | 우리은행 | `1002-133-822329` | 송대석 |
| 신부측 | 우리은행 | `3333-33-333333` | 김다인 |
- 각 계좌에 **복사 버튼** 권장(모바일 UX).

### 12.2 지도/오시는길 (`<MapDirections/>`)
- **네이버맵 임베드** 사용. 단축링크: `https://naver.me/GYCqKhaF`
- 좌표: `37.455800, 127.071087` (지도 핀/딥링크용).
- "네이버지도로 길찾기" 버튼 → 단축링크 새 탭.

### 12.3 편지 (프로토타입 그대로 사용)
- 한국어 원문(초대장 + 공개 페이지 공용):
```
사랑은 삶에서 끊임없이 고민해야하는 주제임에도,
더이상 그것을 고민하지 않고 있음을 깨달았을 때.
그제야 비로소 사랑이 무엇인지 이해할 수 있었습니다.
그래서 이 사랑의 출처인 사람들과 함께
아름다움을 이야기 해 보려 합니다.
8월 22일 여름의 정원에서.

다인과 대석 드림
```
- 영문 번역(공개 페이지 KO/EN용):
```
Though love is a question we are meant to ponder all our lives,
it was the moment we realized we no longer dwelt on it
that we finally came to understand what love truly is.
And so, together with those from whom this love first came,
we wish to speak of its beauty.
On the 22nd of August, in a garden in summer.

With love, Dain & Daeseok
```

### 12.4 사진
- 일단 **mockup**으로 `public/images/`에 구성(§9) → 추후 동일 파일명으로 실사진 replace.

---

## 13. 입력 완료
- 모든 콘텐츠(편지 KO/EN 포함)·설정 확정됨. 추가 입력 없이 §11 체크리스트(P0~P13)대로 구현 착수 가능.
- 실사진은 추후 `public/images/` 동일 파일명으로 replace.
