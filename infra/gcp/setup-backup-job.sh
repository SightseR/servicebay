#!/usr/bin/env bash
# One-time: build the backup image, create the Cloud Run Job and a weekly Cloud Scheduler trigger (Sunday 03:00).
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env.gcp; set +a
gcloud config set project "$PROJECT_ID" >/dev/null
gcloud artifacts repositories describe servicebay --location "$REGION" >/dev/null 2>&1 || gcloud artifacts repositories create servicebay --repository-format=docker --location "$REGION" >/dev/null
IMG="$REGION-docker.pkg.dev/$PROJECT_ID/servicebay/backup:latest"
gcloud builds submit infra/gcp/backup --tag "$IMG" >/dev/null
SA="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
gsutil iam ch "serviceAccount:$SA:objectCreator" "gs://$BACKUP_BUCKET" >/dev/null
if gcloud run jobs describe servicebay-backup --region "$REGION" >/dev/null 2>&1; then
  gcloud run jobs update servicebay-backup --region "$REGION" --image "$IMG" --set-env-vars "BACKUP_BUCKET=$BACKUP_BUCKET" --set-secrets "DATABASE_URL=sb-database-url:latest" >/dev/null
else
  gcloud run jobs create servicebay-backup --region "$REGION" --image "$IMG" --set-env-vars "BACKUP_BUCKET=$BACKUP_BUCKET" --set-secrets "DATABASE_URL=sb-database-url:latest" --max-retries 1 --task-timeout 10m >/dev/null
fi
echo "== running the job once to verify"
gcloud run jobs execute servicebay-backup --region "$REGION" --wait
gsutil ls "gs://$BACKUP_BUCKET"
URI="https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/servicebay-backup:run"
if gcloud scheduler jobs describe servicebay-backup-weekly --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http servicebay-backup-weekly --location "$REGION" --schedule "0 3 * * 0" --uri "$URI" --http-method POST --oauth-service-account-email "$SA" >/dev/null
else
  gcloud scheduler jobs create http servicebay-backup-weekly --location "$REGION" --schedule "0 3 * * 0" --time-zone "Europe/Rome" --uri "$URI" --http-method POST --oauth-service-account-email "$SA" >/dev/null
fi
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role=roles/run.invoker >/dev/null
echo "✔ weekly backup scheduled (Sunday 03:00 Europe/Rome), 60-day retention on gs://$BACKUP_BUCKET"
