#!/usr/bin/env bash
# Nightly backup: database dump + uploads volume → /srv/backups/servicebay, kept 30 days.
# Install: sudo ln -s /srv/servicebay/infra/scripts/backup.sh /etc/cron.daily/servicebay-backup
set -euo pipefail
cd /srv/servicebay
DEST=/srv/backups/servicebay; mkdir -p "$DEST"
STAMP=$(date +%Y%m%d-%H%M)
PG_USER=$(grep -E '^POSTGRES_USER=' .env.prod | cut -d= -f2-)
PG_DB=$(grep -E '^POSTGRES_DB=' .env.prod | cut -d= -f2-)
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T postgres pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner | gzip > "$DEST/db-$STAMP.sql.gz"
docker run --rm -v servicebay_uploads:/data:ro -v "$DEST":/out alpine tar czf "/out/uploads-$STAMP.tar.gz" -C /data .
find "$DEST" -type f -mtime +30 -delete
echo "backup done: $DEST/db-$STAMP.sql.gz"
