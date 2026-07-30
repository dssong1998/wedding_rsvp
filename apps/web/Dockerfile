# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

RUN corepack enable
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN --mount=type=cache,id=pnpm-web,target=/pnpm/store \
  pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY packages/shared packages/shared
COPY apps/web apps/web
COPY wedding-fun.html wedding-invite-1.html wedding-invite-2.html ./

RUN pnpm --filter @wedding/shared build
RUN pnpm --filter web build

FROM node:20-alpine AS runner

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/wedding-fun.html /app/wedding-fun.html
COPY --from=builder /app/wedding-invite-1.html /app/wedding-invite-1.html
COPY --from=builder /app/wedding-invite-2.html /app/wedding-invite-2.html

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
