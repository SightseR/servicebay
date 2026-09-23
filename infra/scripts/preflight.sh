#!/usr/bin/env bash
# Refuses to deploy with placeholder secrets. Run automatically by deploy.sh.
set -euo pipefail
ENV_FILE=${1:-.env.prod}
[ -f "$ENV_FILE" ] || { echo "✘ $ENV_FILE not found"; exit 1; }
fail=0
val() { grep -E "^$1=" "$ENV_FILE" | cut -d= -f2- | tr -d '\r'; }
for k in POSTGRES_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET SEED_MANAGER_PASSWORD; do
  v=$(val "$k")
  if [ -z "$v" ] || echo "$v" | grep -qiE "CHANGE_ME|ChangeMe|servicebay$|replace"; then echo "✘ $k is empty or still a placeholder"; fail=1; fi
done
for k in JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  [ "${#v}" -ge 32 ] || true
  v=$(val "$k"); [ "${#v}" -ge 32 ] || { echo "✘ $k must be at least 32 characters (openssl rand -hex 32)"; fail=1; }
done
[ "$(val JWT_ACCESS_SECRET)" != "$(val JWT_REFRESH_SECRET)" ] || { echo "✘ access and refresh secrets must differ"; fail=1; }
[ "$(val NODE_ENV)" = "production" ] || { echo "✘ NODE_ENV must be production"; fail=1; }
d=$(val DOMAIN); [ -n "$d" ] || { echo "✘ DOMAIN is empty"; fail=1; }
echo "$(val APP_URL)" | grep -q "^https://$d" || { echo "✘ APP_URL must be https://$d"; fail=1; }
echo "$(val CORS_ORIGIN)" | grep -q "^https://$d" || { echo "✘ CORS_ORIGIN must be https://$d"; fail=1; }
[ -n "$(val RESEND_API_KEY)" ] || echo "! RESEND_API_KEY empty — password-reset emails will only be logged, not sent"
docker network inspect edge >/dev/null 2>&1 || { echo "✘ docker network 'edge' missing — start the Traefik stack first"; fail=1; }
[ "$fail" -eq 0 ] && echo "✔ preflight OK" || exit 1
