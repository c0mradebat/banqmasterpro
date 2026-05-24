#!/usr/bin/env bash
# Daily Postgres backup for BanqMaster Pro.
#
# Usage:
#   ./docker/backup.sh                  # writes to ./backups/banqmaster-YYYY-MM-DD.sql.gz
#   BACKUP_DIR=/srv/backups ./docker/backup.sh
#
# Schedule via cron (daily at 02:00):
#   0 2 * * *  cd /path/to/banqmaster-pro && ./docker/backup.sh >> ./backups/backup.log 2>&1
#
# Retention: keeps the last 30 days, deletes older.
# Restore: gunzip -c backup.sql.gz | docker exec -i banqmaster-db psql -U banqmaster -d banqmaster

set -euo pipefail

CONTAINER="${CONTAINER:-banqmaster-db}"
DB_USER="${DB_USER:-banqmaster}"
DB_NAME="${DB_NAME:-banqmaster}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
OUTFILE="$BACKUP_DIR/banqmaster-$TIMESTAMP.sql.gz"

echo "[$(date -Is)] Starting backup → $OUTFILE"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
  | gzip -9 > "$OUTFILE"

SIZE=$(du -h "$OUTFILE" | cut -f1)
echo "[$(date -Is)] Backup complete ($SIZE)"

# Sanity check: dump must not be empty.
if [ ! -s "$OUTFILE" ]; then
  echo "[$(date -Is)] ERROR: backup file is empty, removing." >&2
  rm -f "$OUTFILE"
  exit 1
fi

# Retention cleanup
find "$BACKUP_DIR" -name "banqmaster-*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -print -delete

echo "[$(date -Is)] Done."
