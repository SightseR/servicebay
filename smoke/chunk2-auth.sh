#!/usr/bin/env bash
# Auth smoke: sessions, httpOnly refresh cookie, rotation/reuse, logout, rate limiting. Idempotent.
#   bash smoke/chunk2-auth.sh   (from repo root, Git Bash ok)
set -euo pipefail
API=${API:-http://localhost:8080/api/v1}
TEST_EMAIL="smoke-admin@servicebay.local"
TEST_PASS="SmokePass123"
JAR=$(mktemp); JAR_OLD=$(mktemp); trap 'rm -f "$JAR" "$JAR_OLD"' EXIT

MGR_EMAIL=$(grep -E '^SEED_MANAGER_EMAIL=' .env | cut -d= -f2- | tr -d '\r')
MGR_PASS=$(grep -E '^SEED_MANAGER_PASSWORD=' .env | cut -d= -f2- | tr -d '\r')
PG_USER=$(docker compose exec -T postgres sh -c 'echo $POSTGRES_USER' | tr -d '\r')
PG_DB=$(docker compose exec -T postgres sh -c 'echo $POSTGRES_DB' | tr -d '\r')

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  ✔ $1"; }
bad()  { fail=$((fail+1)); echo "  ✘ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 — expected $3 got $2"; fi; }
json() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);console.log(eval('o.'+process.argv[1])??'')})" "$1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
J='Content-Type: application/json'

echo "== pre-clean"
docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -qc "DELETE FROM \"User\" WHERE email='$TEST_EMAIL';" >/dev/null
ok "removed leftover test user"
until curl -sf -o /dev/null "$API/health"; do sleep 2; done
ok "health"

echo "== manager login (cookie jar)"
MGR=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$MGR_EMAIL\",\"password\":\"$MGR_PASS\"}")
MGR_TOKEN=$(echo "$MGR" | json accessToken)
[ -n "$MGR_TOKEN" ] && ok "manager access token" || { bad "manager login: $MGR"; exit 1; }
check "refresh token NOT in body" "$(echo "$MGR" | json refreshToken)" ""
grep -q "sb_refresh" "$JAR" && ok "refresh cookie set" || bad "no sb_refresh cookie"
grep "sb_refresh" "$JAR" | grep -q "HttpOnly" && ok "cookie is HttpOnly" || bad "cookie not HttpOnly"
check "sid present on user" "$(echo "$MGR" | json 'user.sid.length>0')" "true"

echo "== register → pending → approve"
check "register 201" "$(code -X POST "$API/auth/register" -H "$J" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"displayName\":\"Smoke Admin\"}")" "201"
check "duplicate register 409" "$(code -X POST "$API/auth/register" -H "$J" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"displayName\":\"Smoke Admin\"}")" "409"
check "pending login 401" "$(code -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")" "401"
UID_=$(curl -s "$API/users?status=PENDING" -H "Authorization: Bearer $MGR_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const u=JSON.parse(d).find(u=>u.email==='$TEST_EMAIL');console.log(u?u.id:'')})")
check "approve 200" "$(code -X PATCH "$API/users/$UID_/approve" -H "Authorization: Bearer $MGR_TOKEN")" "200"

echo "== admin session via cookie"
ADM=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
ADM_TOKEN=$(echo "$ADM" | json accessToken)
[ -n "$ADM_TOKEN" ] && ok "admin login" || bad "admin login: $ADM"
check "GET /auth/me" "$(curl -s "$API/auth/me" -H "Authorization: Bearer $ADM_TOKEN" | json email)" "$TEST_EMAIL"
check "no token 401" "$(code "$API/auth/me")" "401"
check "refresh with no cookie and no body → 401" "$(code -X POST "$API/auth/refresh")" "401"

echo "== cookie refresh rotation"
cp "$JAR" "$JAR_OLD"
R1=$(curl -s -b "$JAR" -c "$JAR" -X POST "$API/auth/refresh")
NEW_TOKEN=$(echo "$R1" | json accessToken)
[ -n "$NEW_TOKEN" ] && [ "$NEW_TOKEN" != "$ADM_TOKEN" ] && ok "silent refresh via cookie gives a new access token" || bad "cookie refresh failed: $R1"
check "old cookie reuse → 401 (rotation)" "$(code -b "$JAR_OLD" -X POST "$API/auth/refresh")" "401"
check "reuse revoked the whole session: new cookie now 401 too" "$(code -b "$JAR" -X POST "$API/auth/refresh")" "401"

echo "== logout clears the device session"
ADM2=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
ADM2_TOKEN=$(echo "$ADM2" | json accessToken)
check "logout 204" "$(code -b "$JAR" -c "$JAR" -X POST "$API/auth/logout" -H "Authorization: Bearer $ADM2_TOKEN")" "204"
check "refresh after logout → 401" "$(code -b "$JAR" -X POST "$API/auth/refresh")" "401"

echo "== disable kicks every device immediately"
ADM3=$(curl -s -c "$JAR" -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
ADM3_TOKEN=$(echo "$ADM3" | json accessToken)
check "disable admin 200" "$(code -X PATCH "$API/users/$UID_" -H "Authorization: Bearer $MGR_TOKEN" -H "$J" -d '{"status":"DISABLED"}')" "200"
check "disabled: access token rejected" "$(code "$API/auth/me" -H "Authorization: Bearer $ADM3_TOKEN")" "401"
check "disabled: refresh cookie rejected" "$(code -b "$JAR" -X POST "$API/auth/refresh")" "401"

echo "== rate limit on login (10/min per IP) — run last, it blocks this IP for a minute"
last=""
for i in $(seq 1 12); do last=$(code -X POST "$API/auth/login" -H "$J" -d '{"email":"nobody@x.y","password":"wrongwrong1"}'); done
check "12th rapid login attempt → 429" "$last" "429"

echo; echo "PASS=$pass FAIL=$fail"; [ "$fail" -eq 0 ]
