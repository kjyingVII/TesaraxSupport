# Backup and Restore Guide

This system stores production data in two places:

- PostgreSQL database in the Docker volume `postgres-data`
- Uploaded files in the host folder `./data/uploads`

Always back up both. The database contains records and metadata. The uploads folder contains attachments, manuals, signatures, and generated files.

## Create A Backup

Run from the project folder on the VPS:

```bash
cd /opt/TesaraxSupport
bash scripts/backup-production.sh
```

The backup is saved under:

```text
./backups/YYYYMMDD-HHMMSS/
```

Each backup contains:

- `database.sql.gz`
- `uploads.tar.gz`
- `backup-info.txt`

## Verify A Backup

Check that both files exist and are not empty:

```bash
ls -lh backups/YYYYMMDD-HHMMSS/
gzip -t backups/YYYYMMDD-HHMMSS/database.sql.gz
tar -tzf backups/YYYYMMDD-HHMMSS/uploads.tar.gz | head
```

If `data/uploads` is empty, the upload archive may contain no files. That is acceptable for a new installation.

## Restore To A Clean Server

Use this when setting up a new VPS from backup.

1. Install Docker and clone the repository.
2. Configure `.env`.
3. Start the database only:

```bash
docker compose up -d db redis
```

4. Copy the backup folder into the project, for example:

```text
/opt/TesaraxSupport/backups/20260621-213000/
```

5. Restore:

```bash
cd /opt/TesaraxSupport
bash scripts/restore-production.sh backups/20260621-213000
```

6. Start the full service:

```bash
docker compose up -d --build
docker compose exec -T -w /app/apps/api api pnpm exec prisma migrate deploy --schema=prisma/schema.prisma
```

7. Verify:

```bash
curl -I http://localhost:13000
curl http://localhost:14000/api/health
```

## Restore Warning

Restore replaces the current database and uploaded files. Do not run restore on a live server unless you are intentionally rolling back.

Before restoring on a server with existing data, create a fresh backup first:

```bash
bash scripts/backup-production.sh
```

## Suggested Schedule

Recommended production backup schedule:

- Daily database and upload backup
- Keep daily backups for 14 days
- Keep weekly backups for 8 weeks
- Copy backups off the VPS to another location

Example cron job:

```cron
30 2 * * * cd /opt/TesaraxSupport && bash scripts/backup-production.sh >> /opt/TesaraxSupport/backups/backup-cron.log 2>&1
```

Cron only creates local backups. For safer production operation, also copy the backup folder to another server, cloud storage, or your local machine.
