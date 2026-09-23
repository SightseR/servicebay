#!/usr/bin/env bash
# One-time hardening of a fresh Ubuntu 24.04 Hetzner server. Run ONCE as root:
#   bash server-setup.sh <deploy-user> "<your ssh public key>"
set -euo pipefail
USER_NAME=${1:?deploy user name}
PUBKEY=${2:?ssh public key}

apt-get update && apt-get -y upgrade
apt-get -y install ufw fail2ban unattended-upgrades ca-certificates curl gnupg git

# --- deploy user with sudo + your key; root login and passwords get disabled below
id -u "$USER_NAME" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$USER_NAME"
usermod -aG sudo "$USER_NAME"
install -d -m 700 -o "$USER_NAME" -g "$USER_NAME" "/home/$USER_NAME/.ssh"
echo "$PUBKEY" > "/home/$USER_NAME/.ssh/authorized_keys"
chmod 600 "/home/$USER_NAME/.ssh/authorized_keys"; chown -R "$USER_NAME:$USER_NAME" "/home/$USER_NAME/.ssh"
echo "$USER_NAME ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$USER_NAME"; chmod 440 "/etc/sudoers.d/$USER_NAME"

# --- SSH: keys only, no root
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

# --- firewall: SSH, HTTP, HTTPS only
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

# --- automatic security updates + brute-force protection
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban

# --- Docker (official repo) + compose plugin
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update && apt-get -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker "$USER_NAME"

# --- shared network for Traefik + all project stacks; directories
docker network inspect edge >/dev/null 2>&1 || docker network create edge
install -d -o "$USER_NAME" -g "$USER_NAME" /srv /srv/edge /srv/backups
touch /srv/edge/acme.json && chmod 600 /srv/edge/acme.json && chown "$USER_NAME:$USER_NAME" /srv/edge/acme.json

echo "Done. Log out and back in as $USER_NAME (ssh $USER_NAME@<ip>). Root SSH is now disabled."
