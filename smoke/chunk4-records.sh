#!/usr/bin/env bash
# Chunk 4 smoke: vehicles, records, values, report, company. Idempotent. From repo root: bash smoke/chunk4-records.sh
set -euo pipefail
API=${API:-http://localhost:8080/api/v1}
REG="SMK 123"; REGKEY="SMK123"
ADM_EMAIL="smoke-records@servicebay.local"; ADM_PASS="SmokePass123"

MGR_EMAIL=$(grep -E '^SEED_MANAGER_EMAIL=' .env | cut -d= -f2- | tr -d '\r')
MGR_PASS=$(grep -E '^SEED_MANAGER_PASSWORD=' .env | cut -d= -f2- | tr -d '\r')
PG_USER=$(docker compose exec -T postgres sh -c 'echo $POSTGRES_USER' | tr -d '\r')
PG_DB=$(docker compose exec -T postgres sh -c 'echo $POSTGRES_DB' | tr -d '\r')

pass=0; fail=0
ok()   { pass=$((pass+1)); echo "  ✔ $1"; }
bad()  { fail=$((fail+1)); echo "  ✘ $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 — expected $3 got $2"; fi; }
jq_()  { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);const r=(new Function('o','return '+process.argv[1]))(o);console.log(r==null?'':(typeof r==='object'?JSON.stringify(r):r))})" "$1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
J='Content-Type: application/json'

echo "== pre-clean"
docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -qc \
  "DELETE FROM \"ServiceRecord\" WHERE \"vehicleId\" IN (SELECT id FROM \"Vehicle\" WHERE \"regKey\"='$REGKEY'); DELETE FROM \"Vehicle\" WHERE \"regKey\"='$REGKEY'; DELETE FROM \"User\" WHERE email='$ADM_EMAIL';" >/dev/null
ok "clean"
until curl -sf -o /dev/null "$API/health"; do sleep 2; done

MGR=$(curl -s -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$MGR_EMAIL\",\"password\":\"$MGR_PASS\"}" | jq_ 'o.accessToken')
[ -n "$MGR" ] && ok "manager login" || { bad login; exit 1; }
M="Authorization: Bearer $MGR"

# an approved ADMIN for ownership checks
curl -s -o /dev/null -X POST "$API/auth/register" -H "$J" -d "{\"email\":\"$ADM_EMAIL\",\"password\":\"$ADM_PASS\",\"displayName\":\"Smoke Records\"}"
UID_=$(curl -s "$API/users?status=PENDING" -H "$M" | jq_ "o.find(u=>u.email==='$ADM_EMAIL').id")
curl -s -o /dev/null -X PATCH "$API/users/$UID_/approve" -H "$M"
ADM=$(curl -s -X POST "$API/auth/login" -H "$J" -d "{\"email\":\"$ADM_EMAIL\",\"password\":\"$ADM_PASS\"}" | jq_ 'o.accessToken')
[ -n "$ADM" ] && ok "admin ready" || bad "admin login"
A="Authorization: Bearer $ADM"

echo "== field ids from seeded definition"
DEF=$(curl -s "$API/form/definition" -H "$A")
F_OIL=$(echo "$DEF" | jq_ "o.flatMap(s=>s.fields).find(f=>f.config.legacyKey==='engine.oil_change').id")
F_SCAN=$(echo "$DEF" | jq_ "o.flatMap(s=>s.fields).find(f=>f.config.legacyKey==='scanning.main').id")
F_BFL=$(echo "$DEF" | jq_ "o.flatMap(s=>s.fields).find(f=>f.config.legacyKey==='brakes.front_left').id")
F_NOTE=$(echo "$DEF" | jq_ "o.flatMap(s=>s.fields).find(f=>f.config.legacyKey==='notes.additional_info').id")
[ -n "$F_OIL$F_SCAN$F_BFL$F_NOTE" ] && ok "resolved oil/scan/brake/note fields" || bad "field lookup"

echo "== vehicles"
check "by-reg unknown → null (200)" "$(curl -s "$API/vehicles/by-reg/$REGKEY" -H "$A")" ""
V=$(curl -s -X POST "$API/vehicles" -H "$A" -H "$J" -d "{\"regNumber\":\"$REG\",\"brand\":\" Toyota \",\"model\":\"Corolla\",\"year\":2018,\"gearbox\":\"AUTO\",\"motivePower\":\"HYBRID\",\"ownerName\":\"Smoke Owner\",\"ownerPhone\":\"+358401234567\"}")
VID=$(echo "$V" | jq_ 'o.id')
[ -n "$VID" ] && ok "create vehicle" || bad "create vehicle: $V"
check "brand trimmed" "$(echo "$V" | jq_ 'o.brand')" "Toyota"
check "duplicate reg (different spacing) 409" "$(code -X POST "$API/vehicles" -H "$A" -H "$J" -d '{"regNumber":"smk-123","brand":"X","model":"Y"}')" "409"
check "by-reg finds it" "$(curl -s "$API/vehicles/by-reg/smk-123" -H "$A" | jq_ 'o.id')" "$VID"
check "search by owner name" "$(curl -s "$API/vehicles?q=smoke%20owner" -H "$A" | jq_ 'o.items.length')" "1"
check "search by phone fragment" "$(curl -s "$API/vehicles?q=40123" -H "$A" | jq_ 'o.total')" "1"

echo "== records"
BODY=$(cat <<JSON
{"vehicleId":"$VID","kilometers":123456,"values":[
 {"fieldId":"$F_OIL","value":{"done":true}},
 {"fieldId":"$F_SCAN","value":{"urgent":true,"note":"fault code erase"}},
 {"fieldId":"$F_BFL","value":"80"},
 {"fieldId":"$F_NOTE","value":"  Smoke note  "}
]}
JSON
)
R=$(curl -s -X POST "$API/records" -H "$A" -H "$J" -d "$BODY")
RID=$(echo "$R" | jq_ 'o.id')
[ -n "$RID" ] && ok "create record (admin)" || bad "create record: $R"
check "spec defaulted from vehicle" "$(echo "$R" | jq_ 'o.gearbox+"-"+o.motivePower')" "AUTO-HYBRID"
check "4 values stored" "$(echo "$R" | jq_ 'o.values.length')" "4"
check "grouped into 4 sections" "$(echo "$R" | jq_ 'o.sections.length')" "4"
check "number coerced from string" "$(echo "$R" | jq_ "o.values.find(v=>v.fieldId==='$F_BFL').value.number")" "80"
check "note trimmed" "$(echo "$R" | jq_ "o.values.find(v=>v.fieldId==='$F_NOTE').value.text")" "Smoke note"
check "label snapshot present" "$(echo "$R" | jq_ "o.sections.find(s=>s.title==='Engine services').items[0].label")" "Oil change"

echo "== validation"
check "brake > 100 → 400" "$(code -X POST "$API/records" -H "$A" -H "$J" -d "{\"vehicleId\":\"$VID\",\"values\":[{\"fieldId\":\"$F_BFL\",\"value\":150}]}")" "400"
check "unknown field → 400" "$(code -X POST "$API/records" -H "$A" -H "$J" -d "{\"vehicleId\":\"$VID\",\"values\":[{\"fieldId\":\"$VID\",\"value\":1}]}")" "400"
check "no vehicle → 400" "$(code -X POST "$API/records" -H "$A" -H "$J" -d '{"values":[]}')" "400"
ERR=$(curl -s -X POST "$API/records" -H "$A" -H "$J" -d "{\"vehicleId\":\"$VID\",\"values\":[{\"fieldId\":\"$F_BFL\",\"value\":\"abc\"}]}" | jq_ 'o.errors[0].message')
check "error names the problem" "$ERR" "not a number"

echo "== create with inline new vehicle"
docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -qc "DELETE FROM \"ServiceRecord\" WHERE \"vehicleId\" IN (SELECT id FROM \"Vehicle\" WHERE \"regKey\"='SMK999'); DELETE FROM \"Vehicle\" WHERE \"regKey\"='SMK999';" >/dev/null
R2=$(curl -s -X POST "$API/records" -H "$M" -H "$J" -d "{\"vehicle\":{\"regNumber\":\"SMK 999\",\"brand\":\"Skoda\",\"model\":\"Octavia\"},\"values\":[{\"fieldId\":\"$F_OIL\",\"value\":{\"later\":true}}]}")
RID2=$(echo "$R2" | jq_ 'o.id'); VID2=$(echo "$R2" | jq_ 'o.vehicle.id')
[ -n "$RID2" ] && ok "record + vehicle created in one call" || bad "inline vehicle: $R2"
check "inline vehicle dup reg → 409" "$(code -X POST "$API/records" -H "$M" -H "$J" -d "{\"vehicle\":{\"regNumber\":\"$REG\",\"brand\":\"X\",\"model\":\"Y\"},\"values\":[]}")" "409"

echo "== list / get / report"
check "list all ≥ 2" "$(curl -s "$API/records" -H "$A" | jq_ 'o.total>=2')" "true"
check "list by vehicle" "$(curl -s "$API/records?vehicleId=$VID" -H "$A" | jq_ 'o.total')" "1"
check "list search reg" "$(curl -s "$API/records?q=smk999" -H "$A" | jq_ 'o.items[0].vehicle.regNumber')" "SMK 999"
check "vehicle history" "$(curl -s "$API/vehicles/$VID" -H "$A" | jq_ 'o.records.length')" "1"
REP=$(curl -s "$API/records/$RID/report" -H "$A")
check "report has vehicle" "$(echo "$REP" | jq_ 'o.vehicle.regNumber')" "$REG"
check "report sections only selected" "$(echo "$REP" | jq_ 'o.sections.length')" "4"
check "report company object present" "$(echo "$REP" | jq_ "'company' in o")" "true"

echo "== update (replace values)"
U=$(curl -s -X PATCH "$API/records/$RID" -H "$A" -H "$J" -d "{\"kilometers\":130000,\"values\":[{\"fieldId\":\"$F_OIL\",\"value\":{\"done\":true,\"urgent\":true}}]}")
check "km updated" "$(echo "$U" | jq_ 'o.kilometers')" "130000"
check "values replaced → 1" "$(echo "$U" | jq_ 'o.values.length')" "1"
check "updatedBy set" "$(echo "$U" | jq_ 'o.updatedBy.displayName')" "Smoke Records"

echo "== company"
check "PUT company 200" "$(code -X PUT "$API/company" -H "$A" -H "$J" -d '{"companyName":"Smoke Garage Oy","phone":"+358 40 000 0000"}')" "200"
check "report picks up company" "$(curl -s "$API/records/$RID/report" -H "$A" | jq_ 'o.company.companyName')" "Smoke Garage Oy"

echo "== delete permissions"
check "admin cannot delete manager's record 403" "$(code -X DELETE "$API/records/$RID2" -H "$A")" "403"
check "manager deletes it 204" "$(code -X DELETE "$API/records/$RID2" -H "$M")" "204"
check "vehicle with record → 409" "$(code -X DELETE "$API/vehicles/$VID" -H "$A")" "409"
check "admin deletes own record 204" "$(code -X DELETE "$API/records/$RID" -H "$A")" "204"
check "vehicle now deletable 204" "$(code -X DELETE "$API/vehicles/$VID" -H "$A")" "204"
curl -s -o /dev/null -X DELETE "$API/vehicles/$VID2" -H "$M"

echo; echo "PASS=$pass FAIL=$fail"; [ "$fail" -eq 0 ]
