#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [options]

Fast deploy (default):
  ./deploy.sh                 Restart stack using existing images (.env changes only)

Build + deploy:
  ./deploy.sh --build         Rebuild api + web + layout (uses Docker layer cache)
  ./deploy.sh --build web     Rebuild web only
  ./deploy.sh --build api     Rebuild api only
  ./deploy.sh --build layout  Rebuild layout only (layout.dae-da.com)
  ./deploy.sh --rebuild       Full rebuild without cache (slow, troubleshooting)

Other:
  ./deploy.sh --seed          Run DB seed after deploy
  ./deploy.sh --prune         Free disk space, then deploy

Examples:
  ./deploy.sh --build web     Code changed in apps/web
  ./deploy.sh                 Only deploy/.env updated
EOF
}

case " $* " in
  *" --help "*|*" -h "*)
    usage
    exit 0
    ;;
esac

export DOCKER_BUILDKIT=1
export COMPOSE_BAKE=false

if [ ! -f "$ENV_FILE" ] && [ -f "$ENV_EXAMPLE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "Created ${ENV_FILE} from .env.example."
  echo "Fill real values in ${ENV_FILE}, then run this script again."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file is missing: ${ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1091
. "$ENV_FILE"

DO_SEED=0
DO_PRUNE=0
DO_BUILD=0
DO_REBUILD=0
BUILD_TARGETS=""

append_build_target() {
  target="$1"
  case " ${BUILD_TARGETS} " in
    *" ${target} "*) ;;
    *) BUILD_TARGETS="${BUILD_TARGETS} ${target}" ;;
  esac
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --seed)
      DO_SEED=1
      ;;
    --prune)
      DO_PRUNE=1
      ;;
    --build|-b)
      DO_BUILD=1
      shift
      if [ "$#" -eq 0 ]; then
        append_build_target api
        append_build_target web
        append_build_target layout
      else
        case "$1" in
          api|web|layout|all)
            if [ "$1" = "all" ]; then
              append_build_target api
              append_build_target web
              append_build_target layout
            else
              append_build_target "$1"
            fi
            shift
            ;;
          *)
            append_build_target api
            append_build_target web
            ;;
        esac
      fi
      ;;
    --build=*)
      DO_BUILD=1
      build_value="${1#--build=}"
      case "$build_value" in
        api|web|layout|all)
          if [ "$build_value" = "all" ]; then
            append_build_target api
            append_build_target web
            append_build_target layout
          else
            append_build_target "$build_value"
          fi
          ;;
        *)
          echo "Unknown build target: ${build_value} (use api, web, or all)"
          exit 1
          ;;
      esac
      ;;
    --build-api)
      DO_BUILD=1
      append_build_target api
      ;;
    --build-web)
      DO_BUILD=1
      append_build_target web
      ;;
    --rebuild)
      DO_BUILD=1
      DO_REBUILD=1
      append_build_target api
      append_build_target web
      append_build_target layout
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

BUILD_TARGETS="${BUILD_TARGETS# }"

compose() {
  # shellcheck disable=SC2086
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

image_exists() {
  service="$1"
  compose image "$service" >/dev/null 2>&1
}

AVAIL_KB="$(df -Pk . | awk 'NR==2 { print $4 }')"
MIN_FREE_KB=3145728
if [ "${AVAIL_KB:-0}" -lt "$MIN_FREE_KB" ] && [ "$DO_PRUNE" -eq 0 ]; then
  echo "ERROR: low disk space (<3GB). Build aborted to avoid ENOSPC."
  echo "Run './deploy.sh --prune' first, or free disk manually."
  exit 1
fi

if [ "$DO_PRUNE" -eq 1 ]; then
  echo "[0/4] Pruning unused Docker cache/images..."
  docker builder prune -af
  docker image prune -af
  docker container prune -f
  AVAIL_KB="$(df -Pk . | awk 'NR==2 { print $4 }')"
  if [ "${AVAIL_KB:-0}" -lt "$MIN_FREE_KB" ]; then
    echo "ERROR: disk space is still low after prune (<3GB)."
    echo "Free additional space, then rerun deploy."
    exit 1
  fi
fi

WEB_DOMAIN="${WEB_DOMAIN:-dae-da.com}"
SSL_PROVIDER="${SSL_PROVIDER:-cloudflare}"
CF_SSL_CERT_DIR="${CF_SSL_CERT_DIR:-/etc/ssl/cloudflare}"
CF_SSL_CERT_FILE="${CF_SSL_CERT_FILE:-${WEB_DOMAIN}.pem}"
CF_SSL_KEY_FILE="${CF_SSL_KEY_FILE:-${WEB_DOMAIN}.key}"

if [ "$SSL_PROVIDER" = "cloudflare" ]; then
  CERT_FULLCHAIN="${CF_SSL_CERT_DIR%/}/${CF_SSL_CERT_FILE}"
  CERT_PRIVKEY="${CF_SSL_CERT_DIR%/}/${CF_SSL_KEY_FILE}"
  if [ ! -f "$CERT_FULLCHAIN" ] || [ ! -f "$CERT_PRIVKEY" ]; then
    echo "ERROR: Cloudflare cert files not found."
    echo "Expected:"
    echo "  ${CERT_FULLCHAIN}"
    echo "  ${CERT_PRIVKEY}"
    exit 1
  fi
elif [ "$SSL_PROVIDER" = "letsencrypt" ]; then
  CERT_FULLCHAIN="${SCRIPT_DIR}/certbot/conf/live/${WEB_DOMAIN}/fullchain.pem"
  CERT_PRIVKEY="${SCRIPT_DIR}/certbot/conf/live/${WEB_DOMAIN}/privkey.pem"
else
  echo "ERROR: Unknown SSL_PROVIDER=${SSL_PROVIDER} (use cloudflare or letsencrypt)"
  exit 1
fi

if [ "$DO_BUILD" -eq 0 ]; then
  if ! image_exists api || ! image_exists web || ! image_exists layout; then
    echo "Images missing. Building api + web + layout before first deploy..."
    DO_BUILD=1
    BUILD_TARGETS="api web layout"
  fi
fi

if [ "$DO_BUILD" -eq 1 ]; then
  if [ -z "$BUILD_TARGETS" ]; then
    BUILD_TARGETS="api web layout"
  fi

  BUILD_FLAGS=""
  if [ "$DO_REBUILD" -eq 1 ]; then
    BUILD_FLAGS="--no-cache"
  fi

  echo "[1/4] Building image(s): ${BUILD_TARGETS}..."
  # shellcheck disable=SC2086
  compose build $BUILD_FLAGS $BUILD_TARGETS
else
  echo "[1/4] Skipping image build (use --build when code changed)."
fi

if [ "$SSL_PROVIDER" = "letsencrypt" ] && { [ ! -f "$CERT_FULLCHAIN" ] || [ ! -f "$CERT_PRIVKEY" ]; }; then
  echo "[2/4] TLS cert not found for ${WEB_DOMAIN}. Starting HTTP bootstrap nginx."
  compose up -d --remove-orphans postgres api web
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -f docker-compose.bootstrap.yml up -d --no-deps nginx
  echo "Run './bootstrap-cert.sh --staging' then './bootstrap-cert.sh', and rerun './deploy.sh'."
else
  echo "[2/4] Applying updated stack..."
  compose up -d --remove-orphans
fi

if [ "$DO_SEED" -eq 1 ]; then
  echo "[3/4] Syncing DB schema then running seed..."
  compose exec -T api sh -lc 'pnpm prisma:migrate:deploy || true; pnpm prisma db push'
  compose exec -T api pnpm prisma:seed
  echo "[4/4] Done."
else
  echo "[3/4] Skipping seed."
  echo "[4/4] Done."
  echo "Tip: run './deploy.sh --seed' once if this is first deployment."
fi

NGINX_CID="$(docker ps -q -f name=nginx | head -1 || true)"
if [ -n "$NGINX_CID" ]; then
  if docker exec "$NGINX_CID" grep -rq 'bonelli-layout' /etc/nginx/conf.d/ 2>/dev/null; then
    echo ""
    echo "WARN: nginx still proxies to bonelli-layout (removed). Run:"
    echo "  git pull && docker compose up -d nginx"
    echo "  Expected upstream: layout:80 in nginx/layout.dae-da.com.conf"
  fi
  if [ -z "$(compose ps -q layout 2>/dev/null || true)" ]; then
    echo ""
    echo "WARN: layout container is not running. Run:"
    echo "  ./deploy.sh --build layout"
  fi
fi
