# VPS Deployment Plan

This plan is for deploying the current production-test version to a VPS.

Assumption:

- VPS OS: Ubuntu 22.04 or Ubuntu 24.04
- Runtime: Docker + Docker Compose
- Public access: domain name with HTTPS
- App services: web, api, db, redis
- Upload storage: visible host folder `data/uploads`

## 1. Prepare VPS

Install required packages:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
```

Install Docker using Docker official installation steps.

After Docker is installed, confirm:

```bash
docker --version
docker compose version
```

## 2. Firewall

Allow SSH, HTTP, and HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do not expose PostgreSQL or Redis ports publicly in production.

## 3. Production Environment Values

Before production, copy `.env.example` to `.env` on the VPS:

```bash
cp .env.example .env
```

Then edit `.env`:

```bash
nano .env
```

Replace these values:

```text
POSTGRES_PASSWORD
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
WEB_APP_URL
NEXT_PUBLIC_API_URL
```

Use long random values for JWT secrets.

Example:

```bash
openssl rand -base64 48
```

## 4. Production Docker Compose Changes

Recommended production changes:

- Remove public port mapping for database:
  - remove `5432:5432`
- Remove public port mapping for Redis:
  - remove `6379:6379`
- Keep uploads mounted to a visible host folder:
  - `./data/uploads:/app/uploads`
- Set `WEB_APP_URL` to the real domain:
  - `https://support.yourdomain.com`
- Set `NEXT_PUBLIC_API_URL` to the real API URL:
  - either `https://support.yourdomain.com/api` if using reverse proxy path routing
  - or `https://api.yourdomain.com` if using subdomain routing

## 5. Reverse Proxy and HTTPS

Recommended option:

- Nginx Proxy Manager, or
- Caddy, or
- Nginx + Certbot

Simplest production-test setup:

- Public domain points to web container
- API either:
  - uses subdomain `api.yourdomain.com`, or
  - is routed under `/api`

Current local ports:

```text
web: 13000 -> container 3000
api: 14000 -> container 4000
```

For production, proxy:

```text
https://support.yourdomain.com -> localhost:13000
https://api.yourdomain.com     -> localhost:14000
```

## 6. Upload Storage

Uploaded files are stored in:

```text
data/uploads
```

On the VPS, backup this folder regularly.

Do not delete it during deployment.

## 7. Database Backup

Before every update:

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U postgres -d support_system > backups/support_system_db_$(date +%Y%m%d-%H%M%S).sql
tar -czf backups/uploads_$(date +%Y%m%d-%H%M%S).tar.gz data/uploads
```

## 8. Deployment Steps

Clone or copy project to VPS:

```bash
git clone <your-repo-url> SupportSystem
cd SupportSystem
```

Create upload folder:

```bash
mkdir -p data/uploads
```

Start services:

```bash
docker compose up -d --build
```

Check services:

```bash
docker compose ps
docker compose logs api --tail=100
docker compose logs web --tail=100
```

## 9. First Production Smoke Test

Check:

- Admin login works.
- Customer list opens.
- Machine list opens.
- QR machine access page opens.
- User can submit ticket.
- Ticket attachment uploads.
- Technician can submit service report.
- Service report attachment uploads.
- Direct acknowledgement link works.
- Requester can sign acknowledgement.
- Uploaded files appear in `data/uploads`.

## 10. Update Procedure

Before update:

```bash
docker compose ps
mkdir -p backups
docker compose exec -T db pg_dump -U postgres -d support_system > backups/support_system_db_$(date +%Y%m%d-%H%M%S).sql
tar -czf backups/uploads_$(date +%Y%m%d-%H%M%S).tar.gz data/uploads
```

Update app:

```bash
git pull
docker compose up -d --build web api
```

Do not use:

```bash
docker compose down -v
```

## 11. Production Risks To Fix Before Long-Term Use

Before long-term production, improve:

- Use strong database password.
- Confirm HTTPS is working.
- Disable public PostgreSQL and Redis ports.
- Add automated backups.
- Add server monitoring.
- Add email or WhatsApp/SMS notification later.
- Consider S3-compatible storage later for uploaded files.
