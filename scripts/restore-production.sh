#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="${1:-}"
if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: bash scripts/restore-production.sh backups/YYYYMMDD-HHMMSS" >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "Missing .env file. Run this script from a configured deployment folder." >&2
  exit 1
fi

if [ ! -f "$BACKUP_DIR/database.sql.gz" ] || [ ! -f "$BACKUP_DIR/uploads.tar.gz" ]; then
  echo "Backup folder must contain database.sql.gz and uploads.tar.gz." >&2
  exit 1
fi

set -a
source .env
set +a

POSTGRES_DB="${POSTGRES_DB:-support_system}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

echo "WARNING: This will replace the current database and data/uploads folder."
echo "Backup source: $BACKUP_DIR"
echo "Database: $POSTGRES_DB"
read -r -p "Type RESTORE to continue: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Stopping app containers..."
docker compose stop api web
docker compose up -d db redis

echo "Restoring database..."
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$POSTGRES_DB'
  AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "$POSTGRES_DB";
CREATE DATABASE "$POSTGRES_DB";
SQL
gzip -dc "$BACKUP_DIR/database.sql.gz" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

echo "Restoring uploads..."
rm -rf "$ROOT_DIR/data/uploads"
mkdir -p "$ROOT_DIR/data"
tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "$ROOT_DIR/data"

echo "Restore complete. Start the app with:"
echo "docker compose up -d --build"
