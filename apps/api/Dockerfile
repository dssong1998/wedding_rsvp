FROM node:20-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter @wedding/shared build
RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build

FROM node:20-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

COPY --from=builder /app /app

WORKDIR /app/apps/api
EXPOSE 4000

CMD ["sh", "-c", "pnpm prisma:migrate:deploy || pnpm prisma db push; node dist/main.js"]
