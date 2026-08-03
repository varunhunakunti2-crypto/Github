# Deployment Guide (DEPLOYMENT.md)

This document provides step-by-step instructions to deploy the GitForge monorepo stack onto a fresh Linux/UNIX production server.

## Prerequisites

Ensure the following tools are installed on your server:
- Docker Engine (v24.x or later)
- Docker Compose (v2.x or later)
- Git client
- A domain name pointed to your server IP address (e.g., `gitforge.example.com`)

---

## 1. Setup & Environment Variables

1. Clone the repository on the target server:
   ```bash
   git clone https://github.com/varunhunakunti2-crypto/Github.git gitforge
   cd gitforge
   ```
2. Copy the environment variables template file to active `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and configure your production passwords, JWT secret keys, and domain names:
   ```bash
   nano .env
   ```

---

## 2. Docker Compose Deployment

We use a layered compose stack. The base `docker-compose.yml` configures ports and volumes, while `docker-compose.prod.yml` applies restart policies and isolates services from public network binding.

1. Build and launch all services in detached/background mode:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```
2. Run database initial schema synchronization:
   ```bash
   docker exec -it gitforge-backend npx prisma db push --accept-data-loss
   ```

---

## 3. SSL Configuration (Let's Encrypt / Certbot)

For self-hosted deployments, we obtain TLS certificates via Certbot using Nginx webroot validation.

1. Install Certbot on the host server:
   ```bash
   sudo apt-get update && sudo apt-get install certbot -y
   ```
2. Request a certificate:
   ```bash
   sudo certbot certonly --webroot -w ./nginx/html -d gitforge.example.com --email admin@example.com --agree-tos --no-eff-email
   ```
3. Certificate files will be written to `/etc/letsencrypt/live/gitforge.example.com/`. Mount these certificates into Nginx (the named volume `certs-data` maps to `/etc/letsencrypt` inside the container).

### Auto Renewal Hook

Configure a cron job to renew the certificates twice daily:
1. Make the renewal script executable:
   ```bash
   chmod +x ./scripts/renew-ssl.sh
   ```
2. Open crontab editor:
   ```bash
   crontab -e
   ```
3. Add the following line to check and renew at midnight and noon:
   ```text
   0 0,12 * * * /bin/sh /path/to/gitforge/scripts/renew-ssl.sh >> /var/log/gitforge_ssl_renew.log 2>&1
   ```

---

## 4. Backups and Cron Tasks

To protect GitForge from data loss, configure daily backups:
1. Make backup scripts executable:
   ```bash
   chmod +x ./scripts/backup-db.sh
   chmod +x ./scripts/backup-volumes.sh
   ```
2. Add backup cron schedules to run nightly at 2 AM:
   ```text
   0 2 * * * /bin/sh /path/to/gitforge/scripts/backup-db.sh >> /var/log/gitforge_db_backup.log 2>&1
   0 3 * * * /bin/sh /path/to/gitforge/scripts/backup-volumes.sh >> /var/log/gitforge_vol_backup.log 2>&1
   ```

---

## 5. Architectural Scaling and Service Extraction

To extract the Git Service (`git-daemon`) or NestJS Monolith APIs onto separate server nodes later:
1. Build `backend/git-daemon/Dockerfile` on the isolated node.
2. In `docker-compose.prod.yml` on the main backend node, replace the local `git-daemon` container route with Nginx upstream proxy configurations pointing directly to the new node IP.
