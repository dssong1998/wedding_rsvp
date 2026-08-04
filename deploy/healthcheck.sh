#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

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

WEB_DOMAIN="${WEB_DOMAIN:-dae-da.com}"
API_DOMAIN="${API_DOMAIN:-api.dae-da.com}"
LAYOUT_DOMAIN="${LAYOUT_DOMAIN:-layout.dae-da.com}"

WEB_URL="https://${WEB_DOMAIN}"
API_URL="https://${API_DOMAIN}"
LAYOUT_URL="https://${LAYOUT_DOMAIN}"

echo "Checking web: ${WEB_URL}"
curl -fsS "${WEB_URL}/" > /dev/null

echo "Checking api: ${API_URL}/guests/lookup"
API_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/guests/lookup?name=_healthcheck_")"
if [ "$API_STATUS" -ge 500 ]; then
  echo "ERROR: API returned ${API_STATUS}"
  exit 1
fi

echo "Checking layout app: ${LAYOUT_URL}/"
LAYOUT_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "${LAYOUT_URL}/")"
if [ "$LAYOUT_STATUS" -ge 500 ]; then
  echo "ERROR: Layout returned ${LAYOUT_STATUS}"
  exit 1
fi

echo "Checking layout api: ${API_URL}/layout/storage/status"
LAYOUT_API_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/layout/storage/status")"
if [ "$LAYOUT_API_STATUS" = "404" ]; then
  echo "WARN: Layout API not deployed yet (/layout/storage/status → 404). Run ./deploy.sh --build api"
elif [ "$LAYOUT_API_STATUS" -ge 500 ]; then
  echo "ERROR: Layout API returned ${LAYOUT_API_STATUS}"
  exit 1
fi

echo "OK: api=${API_STATUS} layout=${LAYOUT_STATUS} layout-api=${LAYOUT_API_STATUS}."
