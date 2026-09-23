#!/usr/bin/env bash
# Deploy/update ServiceBay on the server. Idempotent — run for first install and every update.
#   cd /srv/servicebay && bash infra/scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
bash infra/scripts/preflight.sh .env.prod
git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env.prod build --pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans
echo "waiting for the API…"
for i in $(seq 1 30); do
  if docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T backend node -e "fetch('http://localhost:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "✔ API healthy"; exit 0
  fi
  sleep 2
done
echo "✘ API did not become healthy — check: docker compose -f docker-compose.prod.yml logs backend"; exit 1
