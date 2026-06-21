#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f ".env" ]; then
  echo "Missing .env file. Run this script from a configured deployment folder." >&2
  exit 1
fi

set -a
source .env
set +a

POSTGRES_DB="${POSTGRES_DB:-support_system}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$ROOT_DIR/backups/$TIMESTAMP"

mkdir -p "$BACKUP_DIR"

echo "Creating database backup..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/database.sql.gz"

echo "Creating upload backup..."
mkdir -p "$ROOT_DIR/data/uploads"
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$ROOT_DIR/data" uploads

cat > "$BACKUP_DIR/backup-info.txt" <<INFO
Created at: $(date -Iseconds)
Project path: $ROOT_DIR
Database: $POSTGRES_DB
Database user: $POSTGRES_USER
Uploads path: $ROOT_DIR/data/uploads
Git commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)
INFO

echo "Backup complete:"
echo "$BACKUP_DIR"
ls -lh "$BACKUP_DIR"
