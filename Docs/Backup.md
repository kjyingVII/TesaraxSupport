# Backup and Restore

This project keeps important data in two places:

- PostgreSQL database in Docker volume `postgres-data`
- Uploaded files in visible host folder `D:\Codex\SupportSystem\data\uploads`

Do not run `docker compose down -v` during production testing unless you intentionally want to delete Docker volumes.

## Backup Folder

Create a backup folder on the host machine:

```powershell
New-Item -ItemType Directory -Force -Path .\backups
```

## Backup Database

Run this from `D:\Codex\SupportSystem` while the database container is running:

```powershell
docker compose exec -T db pg_dump -U postgres -d support_system > .\backups\support_system_db.sql
```

For dated backups:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
docker compose exec -T db pg_dump -U postgres -d support_system > ".\backups\support_system_db_$stamp.sql"
```

## Backup Uploaded Files

Uploaded files are already visible here:

```text
D:\Codex\SupportSystem\data\uploads
```

Copy the folder to `backups`:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Compress-Archive -Path .\data\uploads -DestinationPath ".\backups\uploads_$stamp.zip"
```

## Restore Database

Warning: restoring a database can overwrite current data. Only run this when you are sure.

```powershell
Get-Content .\backups\support_system_db.sql | docker compose exec -T db psql -U postgres -d support_system
```

## Restore Uploaded Files

Stop the API container first:

```powershell
docker compose stop api
```

Restore the uploaded files into:

```text
D:\Codex\SupportSystem\data\uploads
```

Then start the API container again:

```powershell
docker compose up -d api
```

## Update Safety

Safe commands for application updates:

```powershell
docker compose up -d --build web
docker compose up -d --build api
```

These do not delete the database or uploaded files.

Avoid this command during production testing:

```powershell
docker compose down -v
```

The `-v` option removes Docker volumes such as the database volume.
