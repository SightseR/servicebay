#!/usr/bin/env bash
# Deploy/update ServiceBay on Google Cloud Run + Firebase Hosting. Idempotent; run for first deploy and every update.
#   cd <repo root> && bash infra/gcp/deploy-gcp.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f .env.gcp ] || { echo "✘ .env.gcp missing (copy .env.gcp.example)"; exit 1; }
set -a; . ./.env.gcp; set +a

val_ok() { [ -n "${!1:-}" ] && ! echo "${!1}" | grep -qiE "your-|example|CHANGE"; }
for k in PROJECT_ID REGION SERVICE DOMAIN GCS_BUCKET BACKUP_BUCKET DATABASE_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET SEED_MANAGER_EMAIL SEED_MANAGER_PASSWORD; do
  val_ok "$k" || { echo "✘ $k is empty or a placeholder in .env.gcp"; exit 1; }
done
[ "${#JWT_ACCESS_SECRET}" -ge 32 ] && [ "${#JWT_REFRESH_SECRET}" -ge 32 ] && [ "$JWT_ACCESS_SECRET" != "$JWT_REFRESH_SECRET" ] || { echo "✘ JWT secrets must be ≥32 chars and different"; exit 1; }
[ -n "${RESEND_API_KEY:-}" ] || echo "! RESEND_API_KEY empty — password-reset emails will only be logged"

gcloud config set project "$PROJECT_ID" >/dev/null
echo "== enabling APIs (idempotent)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com storage.googleapis.com cloudscheduler.googleapis.com >/dev/null

echo "== buckets"
gsutil ls -b "gs://$GCS_BUCKET" >/dev/null 2>&1 || gsutil mb -l "$REGION" -b on "gs://$GCS_BUCKET"
gsutil iam ch allUsers:objectViewer "gs://$GCS_BUCKET" >/dev/null           # logo is public by design
gsutil ls -b "gs://$BACKUP_BUCKET" >/dev/null 2>&1 || gsutil mb -l "$REGION" -b on "gs://$BACKUP_BUCKET"
printf '{"rule":[{"action":{"type":"Delete"},"condition":{"age":60}}]}' > /tmp/lc.json && gsutil lifecycle set /tmp/lc.json "gs://$BACKUP_BUCKET" >/dev/null

echo "== secrets → Secret Manager (new version only if changed)"
put_secret() {
  local name=$1 value=$2
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    current=$(gcloud secrets versions access latest --secret="$name" 2>/dev/null || true)
    [ "$current" = "$value" ] || printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
  else
    printf '%s' "$value" | gcloud secrets create "$name" --replication-policy=automatic --data-file=- >/dev/null
  fi
}
put_secret sb-database-url "$DATABASE_URL"
put_secret sb-jwt-access "$JWT_ACCESS_SECRET"
put_secret sb-jwt-refresh "$JWT_REFRESH_SECRET"
put_secret sb-resend-key "${RESEND_API_KEY:-}"
put_secret sb-seed-manager-password "$SEED_MANAGER_PASSWORD"
SA="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
for s in sb-database-url sb-jwt-access sb-jwt-refresh sb-resend-key sb-seed-manager-password; do
  gcloud secrets add-iam-policy-binding "$s" --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor >/dev/null
done
gsutil iam ch "serviceAccount:$SA:objectAdmin" "gs://$GCS_BUCKET" >/dev/null

echo "== Cloud Run: build + deploy backend"
gcloud run deploy "$SERVICE" --source backend --region "$REGION" --platform managed \
  --allow-unauthenticated --min-instances 0 --max-instances 2 --memory 512Mi --cpu 1 --concurrency 40 \
  --set-env-vars "NODE_ENV=production,APP_URL=https://$DOMAIN,CORS_ORIGIN=https://$DOMAIN,STORAGE_DRIVER=gcs,GCS_BUCKET=$GCS_BUCKET,MAIL_FROM=$MAIL_FROM,SEED_MANAGER_EMAIL=$SEED_MANAGER_EMAIL,SEED_MANAGER_NAME=${SEED_MANAGER_NAME:-Manager},JWT_ACCESS_TTL=15m,JWT_REFRESH_TTL=7d" \
  --set-secrets "DATABASE_URL=sb-database-url:latest,JWT_ACCESS_SECRET=sb-jwt-access:latest,JWT_REFRESH_SECRET=sb-jwt-refresh:latest,RESEND_API_KEY=sb-resend-key:latest,SEED_MANAGER_PASSWORD=sb-seed-manager-password:latest"

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo "== health: $URL/api/v1/health"
curl -sf "$URL/api/v1/health" && echo

echo "== frontend build + Firebase Hosting"
( cd frontend && npm ci && npm run build )
[ -f .firebaserc ] || printf '{ "projects": { "default": "%s" } }\n' "$PROJECT_ID" > .firebaserc
firebase deploy --only hosting --project "$PROJECT_ID"
echo "✔ deployed — https://$DOMAIN (once the custom domain is connected in Firebase Hosting)"
