# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /app

ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/layout/package.json apps/layout/package.json

RUN --mount=type=cache,id=pnpm-layout,target=/pnpm/store \
  pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY apps/layout apps/layout

RUN pnpm --filter layout build

FROM nginx:1.27-alpine AS runner

COPY apps/layout/deploy/nginx-docker.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/layout/dist /usr/share/nginx/html

EXPOSE 80
