#!/bin/sh
set -eu
: "${DATABASE_URL:?}" "${BACKUP_BUCKET:?}"
NAME="db-$(date +%Y%m%d-%H%M).sql.gz"
pg_dump "$DATABASE_URL" --no-owner | gzip > "/tmp/$NAME"
TOKEN=$(curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" | sed -E 's/.*"access_token":"([^"]+)".*/\1/')
curl -sf -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/gzip" \
  --data-binary "@/tmp/$NAME" \
  "https://storage.googleapis.com/upload/storage/v1/b/$BACKUP_BUCKET/o?uploadType=media&name=$NAME" >/dev/null
echo "uploaded gs://$BACKUP_BUCKET/$NAME ($(du -h /tmp/$NAME | cut -f1))"
