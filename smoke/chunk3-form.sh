#!/usr/bin/env bash
# Chunk 3 smoke: form-builder API. Idempotent. Run from repo root: bash smoke/chunk3-form.sh
set -euo pipefail
API=${API:-http://localhost:8080/api/v1}
TITLE="Smoke section"

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
docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -qc \
  "DELETE FROM \"FormField\" WHERE \"sectionId\" IN (SELECT id FROM \"FormSection\" WHERE \"titleEn\"='$TITLE'); DELETE FROM \"FormSection\" WHERE \"titleEn\"='$TITLE';" >/dev/null
ok "removed leftover smoke section"

until curl -sf -o /dev/null "$API/health"; do sleep 2; done
TOKEN=$(curl -s -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$MGR_EMAIL\",\"password\":\"$MGR_PASS\"}" | json accessToken)
[ -n "$TOKEN" ] && ok "manager login" || { bad "login"; exit 1; }
A="Authorization: Bearer $TOKEN"

echo "== definition"
check "definition unauthenticated 401" "$(code "$API/form/definition")" "401"
check "seeded sections" "$(curl -s "$API/form/definition" -H "$A" | json length)" "5"
check "seeded fields" "$(curl -s "$API/form/definition" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).reduce((n,s)=>n+s.fields.length,0)))")" "37"

echo "== sections"
SEC=$(curl -s -X POST "$API/form/sections" -H "$A" -H "$J" -d "{\"titleEn\":\"$TITLE\",\"titleIt\":\"Sezione prova\"}" | json id)
[ -n "$SEC" ] && ok "create section" || bad "create section"
check "section appended last (sortOrder 60)" "$(curl -s "$API/form/definition" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).find(s=>s.id==='$SEC').sortOrder))")" "60"
check "empty title 400" "$(code -X POST "$API/form/sections" -H "$A" -H "$J" -d '{"titleEn":"   "}')" "400"

echo "== fields"
F_CHK=$(curl -s -X POST "$API/form/sections/$SEC/fields" -H "$A" -H "$J" -d '{"labelEn":"Coolant flush","labelIt":"Lavaggio refrigerante","type":"CHECKLIST","config":{"allowNote":true}}' | json id)
F_NUM=$(curl -s -X POST "$API/form/sections/$SEC/fields" -H "$A" -H "$J" -d '{"labelEn":"Tyre tread","type":"NUMBER","config":{"unit":"mm","min":0,"max":12}}' | json id)
F_DD=$(curl -s -X POST "$API/form/sections/$SEC/fields" -H "$A" -H "$J" -d '{"labelEn":"Tyre season","type":"DROPDOWN","options":[{"labelEn":"Summer","labelIt":"Estate"},{"labelEn":"Winter"},{"labelEn":"All-season"}]}' | json id)
F_TXT=$(curl -s -X POST "$API/form/sections/$SEC/fields" -H "$A" -H "$J" -d '{"labelEn":"Technician remark","type":"TEXT","config":{"maxLength":200}}' | json id)
[ -n "$F_CHK$F_NUM$F_DD$F_TXT" ] && ok "created 4 fields (checklist, number, dropdown, text)" || bad "field creation"
check "dropdown without options 400" "$(code -X POST "$API/form/sections/$SEC/fields" -H "$A" -H "$J" -d '{"labelEn":"X","type":"DROPDOWN"}')" "400"
check "wrong config key 400" "$(code -X POST "$API/form/sections/$SEC/fields" -H "$A" -H "$J" -d '{"labelEn":"X","type":"TEXT","config":{"unit":"%"}}')" "400"
check "unknown type 400" "$(code -X POST "$API/form/sections/$SEC/fields" -H "$A" -H "$J" -d '{"labelEn":"X","type":"SLIDER"}')" "400"
check "dropdown has 3 options" "$(curl -s "$API/form/definition" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).find(s=>s.id==='$SEC').fields.find(f=>f.id==='$F_DD').options.length))")" "3"
check "section carries both languages" "$(curl -s "$API/form/definition" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const s=JSON.parse(d).find(s=>s.id==='$SEC');console.log(s.titleEn+'|'+s.titleIt)})")" "$TITLE|Sezione prova"
check "field with no Italian falls back cleanly (titleIt null, not empty string)" "$(curl -s "$API/form/definition" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const f=JSON.parse(d).find(s=>s.id==='$SEC').fields.find(f=>f.id==='$F_NUM');console.log(f.labelIt===null)})")" "true"

echo "== update / reorder"
check "type change TEXT→NUMBER (no values) 200" "$(code -X PATCH "$API/form/fields/$F_TXT" -H "$A" -H "$J" -d '{"type":"NUMBER","config":{"unit":"bar"}}')" "200"
check "reorder fields 200" "$(code -X POST "$API/form/sections/$SEC/fields/reorder" -H "$A" -H "$J" -d "{\"ids\":[\"$F_TXT\",\"$F_DD\",\"$F_NUM\",\"$F_CHK\"]}")" "200"
check "first field is now the text one" "$(curl -s "$API/form/definition" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).find(s=>s.id==='$SEC').fields[0].id))")" "$F_TXT"
check "deactivate field 200" "$(code -X PATCH "$API/form/fields/$F_CHK" -H "$A" -H "$J" -d '{"active":false}')" "200"
check "inactive field hidden from definition" "$(curl -s "$API/form/definition" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).find(s=>s.id==='$SEC').fields.length))")" "3"
check "…but visible with includeInactive" "$(curl -s "$API/form/definition?includeInactive=1" -H "$A" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).find(s=>s.id==='$SEC').fields.length))")" "4"

echo "== options"
OPT=$(curl -s -X POST "$API/form/fields/$F_DD/options" -H "$A" -H "$J" -d '{"labelEn":"Studded"}' | json id)
[ -n "$OPT" ] && ok "add option" || bad "add option"
check "option on non-choice field 400" "$(code -X POST "$API/form/fields/$F_NUM/options" -H "$A" -H "$J" -d '{"labelEn":"X"}')" "400"
check "rename option 200" "$(code -X PATCH "$API/form/options/$OPT" -H "$A" -H "$J" -d '{"labelEn":"Studded winter"}')" "200"
check "delete unused option 204" "$(code -X DELETE "$API/form/options/$OPT" -H "$A")" "204"

echo "== delete guards"
check "delete section with fields 409" "$(code -X DELETE "$API/form/sections/$SEC" -H "$A")" "409"
for f in $F_CHK $F_NUM $F_DD $F_TXT; do curl -s -o /dev/null -X DELETE "$API/form/fields/$f" -H "$A"; done
ok "deleted 4 unused fields"
check "delete empty section 204" "$(code -X DELETE "$API/form/sections/$SEC" -H "$A")" "204"
check "sections back to 5" "$(curl -s "$API/form/definition" -H "$A" | json length)" "5"

echo; echo "PASS=$pass FAIL=$fail"; [ "$fail" -eq 0 ]
