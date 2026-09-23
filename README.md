# ServiceBay

Vehicle inspection & service-record system. See `docs/DESIGN.md`.

## Local development
```
cp .env.example .env            # set JWT secrets: openssl rand -hex 32
docker compose up -d --build
docker compose exec backend npx prisma db seed
curl http://localhost:8080/api/v1/health
```
App: http://localhost:8080 · API: http://localhost:8080/api/v1 · Postgres: localhost:5433

Production: see `docs/DEPLOY.md` (Hetzner + Traefik runbook). Backups/restore: `infra/scripts/`.
