# ServiceBay — production deploy runbook (Hetzner)

Target: one Hetzner Cloud server hosting several projects as `<project>.sightser.site`, each its own Docker Compose stack,
one shared Traefik doing TLS. ServiceBay is the first tenant. Estimated time first run: ~1 hour, mostly waiting on DNS.

## 0. Before you start (from your laptop)
- [ ] Resend: `sightser.site` shows **Verified**, and you have an API key.
- [ ] Decide the manager email for the client (seed account) — they'll change the password on first login.
- [ ] Have `migration/vehicleServices.json` (the Firestore export) at hand — it is git-ignored and must be copied to the server by hand.

## 1. Order the server
Hetzner Cloud → New server: **Ubuntu 24.04**, **CX32** (4 vCPU / 8 GB — room for 3–4 small stacks), location **Helsinki**,
add your SSH public key, enable **backups** (Hetzner snapshots, ~20% surcharge — worth it), no extra volumes needed.
Note the public IPv4 → `SERVER_IP`.

## 2. DNS (at your registrar for sightser.site)
```
A     *      SERVER_IP     # wildcard: every <project>.sightser.site → this box
A     @      SERVER_IP     # optional, apex
```
Check from your laptop after a few minutes: `nslookup servicebay.sightser.site` → SERVER_IP.

## 3. Harden the box (once)
Either run the script (recommended — also installs fail2ban and Docker):
```bash
scp infra/scripts/server-setup.sh root@SERVER_IP:/root/ && ssh root@SERVER_IP 'bash server-setup.sh deploy "$(cat ~/.ssh/id_ed25519.pub)"'
```
or do it by hand:
```bash
ssh root@SERVER_IP
adduser deploy && usermod -aG sudo deploy && rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl restart ssh
apt update && apt -y upgrade && apt -y install ufw unattended-upgrades git curl
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
dpkg-reconfigure -plow unattended-upgrades
curl -fsSL https://get.docker.com | sh && usermod -aG docker deploy
exit
ssh deploy@SERVER_IP          # everything below as deploy
```

## 4. Shared Traefik edge (once per server)
```bash
sudo mkdir -p /srv/edge /srv/backups && sudo chown -R deploy:deploy /srv     # already done if you used server-setup.sh
git clone https://github.com/SightseR/servicebay.git /srv/servicebay
cp -r /srv/servicebay/infra/traefik/* /srv/edge/ && cd /srv/edge
cp .env.example .env && nano .env            # ACME_EMAIL=your@email
docker network inspect edge >/dev/null 2>&1 || docker network create edge
[ -f acme.json ] || { touch acme.json && chmod 600 acme.json; }
docker compose up -d && docker compose logs --tail=20 traefik
```
Future projects: same `edge` network + the two Traefik labels from `docker-compose.prod.yml`; nothing here changes.

## 5. ServiceBay — first deploy
```bash
cd /srv/servicebay
cp .env.prod.example .env.prod && nano .env.prod
```
Fill every `CHANGE_ME`: `openssl rand -hex 32` twice for the JWT secrets, a long random `POSTGRES_PASSWORD`,
a strong `SEED_MANAGER_PASSWORD`, `SEED_MANAGER_EMAIL`, `RESEND_API_KEY`. Keep `DOMAIN=servicebay.sightser.site`.
```bash
chmod 600 .env.prod
bash infra/scripts/deploy.sh          # preflight → build → up → waits for the API
docker compose -f docker-compose.prod.yml --env-file .env.prod exec backend npx prisma db seed
```
Open https://servicebay.sightser.site — padlock valid (Traefik fetched the certificate on first request; give it ~30 s).
Log in as the seeded manager.

## 6. Import the client's data
The production image ships only the compiled app, so the import runs from a one-off container built from the dev image (which has ts-node):
```bash
scp migration/vehicleServices.json deploy@SERVER_IP:/srv/servicebay/migration/      # from your laptop, then on the server:
cd /srv/servicebay
docker build -t servicebay-tools --target dev ./backend
PGU=$(grep ^POSTGRES_USER= .env.prod | cut -d= -f2); PGP=$(grep ^POSTGRES_PASSWORD= .env.prod | cut -d= -f2); PGD=$(grep ^POSTGRES_DB= .env.prod | cut -d= -f2)
docker run --rm --network servicebay_internal \
  -e DATABASE_URL="postgresql://$PGU:$PGP@postgres:5432/$PGD" \
  -v /srv/servicebay/migration:/import:ro servicebay-tools \
  npx ts-node --transpile-only prisma/legacy-import.ts /import/vehicleServices.json --dry-run
# then the same without --dry-run
```
Expect the same stats as locally (49 records / 24 vehicles / 156 values). Re-running is safe (idempotent by legacyId).

## 7. Backups
```bash
sudo ln -s /srv/servicebay/infra/scripts/backup.sh /etc/cron.daily/servicebay-backup
bash infra/scripts/backup.sh && ls -la /srv/backups/servicebay
```
Daily DB dump + uploads (logo) archive, 30-day retention, plus Hetzner's server snapshots. Restore: `infra/scripts/restore.sh <dump>`.
Copy `/srv/backups` off-box occasionally (a Hetzner Storage Box via `rsync` is the natural next step).

## 8. Smoke-test production
```bash
curl -s https://servicebay.sightser.site/api/v1/health          # {"status":"ok",...}
curl -sI https://servicebay.sightser.site | grep -iE "strict-transport|content-security"   # HSTS + CSP headers present
```
Then in a browser: log in as the manager → reload (stays logged in) → Admin → Company (set details, upload the logo) →
open an imported record → Print (logo + header) → Italian toggle → Export CSV → sign out → Forgot password (a real email arrives).
The local smoke scripts are for the dev stack only (they talk to the dev compose's Postgres); don't run them here.

## 9. Client UAT, then cutover
1. Give the client the URL + manager credentials; they change the password on first login (Profile).
2. They test for a few days while the old Firebase app stays live.
3. Cutover day: in Firebase → Firestore → Rules, set `allow read: if true; allow write: if false;` (old app becomes read-only).
4. Re-export from Cloud Shell (`migration/README.md` §1), copy the new JSON to the server, run §6b again — only records added since 9 Sept are inserted.
5. Confirm counts match, hand over. Keep the old Firebase project for a month, then delete it.

## Updating later
```bash
ssh deploy@SERVER_IP && cd /srv/servicebay && bash infra/scripts/deploy.sh
```
Migrations run automatically at backend start. Zero-downtime is not needed for a single garage; the API is unavailable for ~20 s during a deploy.

## Adding the next project
DNS is already wildcard. On the server: clone it under `/srv/<project>`, give its compose the `edge` external network and labels
`traefik.http.routers.<project>.rule=Host(\`<project>.sightser.site\`)` + `tls.certresolver=letsencrypt`, `up -d`. Done.
