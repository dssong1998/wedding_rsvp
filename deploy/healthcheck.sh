#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f ".env" ]; then
  echo "ERROR: deploy/.env file is missing."
  exit 1
fi

# shellcheck disable=SC1091
. ".env"

WEB_DOMAIN="${WEB_DOMAIN:-daeseokdain.com}"
API_DOMAIN="${API_DOMAIN:-api.daeseokdain.com}"

WEB_URL="https://${WEB_DOMAIN}"
API_URL="https://${API_DOMAIN}"

echo "Checking web: ${WEB_URL}"
curl -fsS "${WEB_URL}/" > /dev/null

echo "Checking api: ${API_URL}/guests/lookup"
API_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/guests/lookup?name=_healthcheck_")"
if [ "$API_STATUS" -ge 500 ]; then
  echo "ERROR: API returned ${API_STATUS}"
  exit 1
fi

echo "OK: web/api are reachable (api status=${API_STATUS})."
