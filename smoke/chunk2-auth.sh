#!/usr/bin/env bash
# Chunk 2 smoke: auth + users + pending approval. Idempotent. Run from repo root in Git Bash:
#   bash smoke/chunk2-auth.sh
set -euo pipefail
API=${API:-http://localhost:8080/api/v1}
TEST_EMAIL="smoke-admin@servicebay.local"
TEST_PASS="SmokePass123"

# read seed manager creds from .env
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

echo "== pre-clean"
docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -qc "DELETE FROM \"User\" WHERE email='$TEST_EMAIL';" >/dev/null
ok "removed leftover test user"

echo "== boot"
until curl -sf -o /dev/null "$API/health"; do sleep 2; done
ok "health"

echo "== manager login"
MGR=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$MGR_EMAIL\",\"password\":\"$MGR_PASS\"}")
MGR_TOKEN=$(echo "$MGR" | json accessToken)
[ -n "$MGR_TOKEN" ] && ok "manager token" || { bad "manager login: $MGR"; exit 1; }
check "manager role" "$(echo "$MGR" | json user.role)" "MANAGER"

echo "== register → pending"
check "register 201" "$(code -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"displayName\":\"Smoke Admin\"}")" "201"
check "duplicate register 409" "$(code -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\",\"displayName\":\"Smoke Admin\"}")" "409"
check "weak password 400" "$(code -X POST "$API/auth/register" -H 'Content-Type: application/json' -d '{"email":"x@y.z","password":"short","displayName":"X"}')" "400"
check "pending login 401" "$(code -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")" "401"

echo "== manager approves"
PENDING=$(curl -s "$API/users?status=PENDING" -H "Authorization: Bearer $MGR_TOKEN")
UID_=$(echo "$PENDING" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const u=JSON.parse(d).find(u=>u.email==='$TEST_EMAIL');console.log(u?u.id:'')})")
[ -n "$UID_" ] && ok "pending user listed" || bad "pending user not listed: $PENDING"
check "approve 200" "$(code -X PATCH "$API/users/$UID_/approve" -H "Authorization: Bearer $MGR_TOKEN")" "200"
check "approve again 400" "$(code -X PATCH "$API/users/$UID_/approve" -H "Authorization: Bearer $MGR_TOKEN")" "400"

echo "== admin session"
ADM=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
ADM_TOKEN=$(echo "$ADM" | json accessToken); ADM_REFRESH=$(echo "$ADM" | json refreshToken)
[ -n "$ADM_TOKEN" ] && ok "admin login" || bad "admin login: $ADM"
check "GET /auth/me" "$(curl -s "$API/auth/me" -H "Authorization: Bearer $ADM_TOKEN" | json email)" "$TEST_EMAIL"
check "admin cannot list users 403" "$(code "$API/users" -H "Authorization: Bearer $ADM_TOKEN")" "403"
check "no token 401" "$(code "$API/auth/me")" "401"
check "refresh token as access 401" "$(code "$API/auth/me" -H "Authorization: Bearer $ADM_REFRESH")" "401"

echo "== refresh rotation"
R1=$(curl -s -X POST "$API/auth/refresh" -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$ADM_REFRESH\"}")
NEW_REFRESH=$(echo "$R1" | json refreshToken)
[ -n "$NEW_REFRESH" ] && [ "$NEW_REFRESH" != "$ADM_REFRESH" ] && ok "rotated" || bad "rotation failed: $R1"
check "old refresh reuse 401" "$(code -X POST "$API/auth/refresh" -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$ADM_REFRESH\"}")" "401"
check "new refresh revoked by reuse 401" "$(code -X POST "$API/auth/refresh" -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$NEW_REFRESH\"}")" "401"

echo "== disable"
check "self-disable blocked 400" "$(code -X PATCH "$API/users/$(echo "$MGR" | json user.id)" -H "Authorization: Bearer $MGR_TOKEN" -H 'Content-Type: application/json' -d '{"status":"DISABLED"}')" "400"
check "disable admin 200" "$(code -X PATCH "$API/users/$UID_" -H "Authorization: Bearer $MGR_TOKEN" -H 'Content-Type: application/json' -d '{"status":"DISABLED"}')" "200"
check "disabled token rejected immediately 401" "$(code "$API/auth/me" -H "Authorization: Bearer $ADM_TOKEN")" "401"

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
