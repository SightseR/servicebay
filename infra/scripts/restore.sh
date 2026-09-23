#!/usr/bin/env bash
# Restore a database dump made by backup.sh. STOPS the backend during restore.
#   bash infra/scripts/restore.sh /srv/backups/servicebay/db-20260923-0300.sql.gz
set -euo pipefail
cd /srv/servicebay
DUMP=${1:?usage: restore.sh <db-*.sql.gz>}
PG_USER=$(grep -E '^POSTGRES_USER=' .env.prod | cut -d= -f2-)
PG_DB=$(grep -E '^POSTGRES_DB=' .env.prod | cut -d= -f2-)
C="docker compose -f docker-compose.prod.yml --env-file .env.prod"
$C stop backend
$C exec -T postgres psql -U "$PG_USER" -d postgres -c "DROP DATABASE IF EXISTS ${PG_DB}_restore;" -c "CREATE DATABASE ${PG_DB}_restore;"
gunzip -c "$DUMP" | $C exec -T postgres psql -U "$PG_USER" -d "${PG_DB}_restore" -q
$C exec -T postgres psql -U "$PG_USER" -d postgres -c "ALTER DATABASE $PG_DB RENAME TO ${PG_DB}_old_$(date +%s);" -c "ALTER DATABASE ${PG_DB}_restore RENAME TO $PG_DB;"
$C start backend
echo "restored. the previous database is kept as ${PG_DB}_old_* — drop it once you've verified."
