# ServiceBay — production deploy, Option B: Google Cloud Run + Neon + Firebase Hosting (≈ €0/month)

For a two-user, ~15-inspections-a-week workload every piece below stays inside a free tier.
Trade-off vs the Hetzner option (`docs/DEPLOY.md`): the first request after ~15 idle minutes takes 3–5 s (cold start). Fine for this client.

| Piece | Where | Why |
|---|---|---|
| API (NestJS) | Cloud Run `servicebay-api`, scale-to-zero, region `europe-west1` | free tier: 2M requests/month |
| Database | Neon Free, region Frankfurt (`eu-central-1`) | free: 100 CU-h/month, 0.5 GB — we'll use a fraction |
| Frontend | Firebase Hosting, custom domain, `/api/**` rewritten to Cloud Run (same origin → cookies just work) | free |
| Logo | Cloud Storage bucket (public read) | free |
| Backups | weekly Cloud Run Job `pg_dump` → bucket, 60-day retention | free |
| Secrets | Secret Manager | free |

## 0. Accounts & tools (once, on your laptop)
- Google Cloud: create a project (e.g. `servicebay-prod`), **attach a billing account** (required even for free tiers).
  Then Billing → Budgets → create a budget of **€1** with email alerts at 50/90/100 % — your safety net.
- Install `gcloud` (Google Cloud CLI) and `firebase-tools` (`npm i -g firebase-tools`), then `gcloud auth login`, `gcloud auth application-default login`, `firebase login`.
- Firebase: console.firebase.google.com → **Add project → choose the existing GCP project** (this enables Hosting on it).
- Neon: neon.com → New project → region **Frankfurt** → copy the **direct** (non-pooled) connection string.
- Resend: domain `sightser.site` verified, API key ready.

## 1. Configure
```bash
cd /c/projects/VehicleServiceApp/servicebay
cp .env.gcp.example .env.gcp
nano .env.gcp          # PROJECT_ID, buckets (globally unique names), Neon DATABASE_URL, secrets, manager email/password
```
`openssl rand -hex 32` twice for the JWT secrets. `.env.gcp` is git-ignored.

## 2. First deploy
```bash
cd /c/projects/VehicleServiceApp/servicebay
bash infra/gcp/deploy-gcp.sh
```
The script: enables APIs → creates buckets → pushes secrets to Secret Manager → builds the backend with Cloud Build and deploys it to Cloud Run
(migrations run at container start) → checks `/api/v1/health` → builds the frontend → deploys it to Firebase Hosting.
First run takes ~5–8 minutes (Cloud Build). Later runs are the same command.

## 3. Seed and import (from your laptop, straight against Neon)
Neon is reachable over TLS from anywhere, so the one-off scripts run locally with the production URL:
```bash
cd /c/projects/VehicleServiceApp/servicebay/backend
set -a; . ../.env.gcp; set +a
npx prisma db seed                                                         # manager account + form definition
npm run legacy:import -- ../migration/vehicleServices.json --dry-run       # expect 49 / 24 / 156
npm run legacy:import -- ../migration/vehicleServices.json
```
(`set -a; . ../.env.gcp` exports DATABASE_URL and the SEED_* values for these commands only.)

## 4. Custom domain
Firebase console → Hosting → **Add custom domain** → `servicebay.sightser.site`. It gives you a TXT record (ownership) and then
A records to add at your DNS provider. Add them; the certificate is issued automatically (minutes to a few hours).
Until then the site is also reachable at `https://<project-id>.web.app` — but log in only via the custom domain,
because cookies/CORS are configured for `https://servicebay.sightser.site`.

## 5. Backups
```bash
cd /c/projects/VehicleServiceApp/servicebay
bash infra/gcp/setup-backup-job.sh        # builds the job, runs it once, schedules Sundays 03:00
```
Restore: download a `db-*.sql.gz` from the backup bucket and `gunzip -c file | psql "$DATABASE_URL"` into a fresh Neon branch/database, then point the app at it.
Neon Free also keeps 6 hours of instant-restore history on its own.

## 6. Smoke-test production
```bash
curl -s https://servicebay.sightser.site/api/v1/health
curl -sI https://servicebay.sightser.site | grep -iE "strict-transport|content-security"
```
Then in a browser: log in → reload (stays logged in) → Admin → Company (details + logo → logo URL is `https://storage.googleapis.com/...`) →
open an imported record → Print → Italian toggle → Export CSV → sign out → Forgot password (real email).
Note the first load after idle is slow (cold start) — that's expected.

## 7. Client UAT, then cutover
Same as the Hetzner runbook §9: client tests for a few days → set Firestore rules read-only → re-export from Cloud Shell →
run the import (§3) again for the delta → hand over.

## Updating later
```bash
cd /c/projects/VehicleServiceApp/servicebay && bash infra/gcp/deploy-gcp.sh
```

## Cost guard-rails
- Cloud Run `--max-instances 2` caps the blast radius of any traffic spike.
- The €1 budget alert emails you before anything could be charged.
- If Neon ever suspends for exceeding Free limits (unlikely at this usage), upgrading to its pay-as-you-go plan is a click and costs a few euros.
