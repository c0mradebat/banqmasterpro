#!/usr/bin/env bash
# Restore a BanqMaster Pro Postgres backup.
#
# Usage:
#   ./docker/restore.sh ./backups/banqmaster-2026-05-12_020000.sql.gz
#
# DESTRUCTIVE: drops and recreates the target database. Operator must confirm.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-backup.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER="${CONTAINER:-banqmaster-db}"
DB_USER="${DB_USER:-banqmaster}"
DB_NAME="${DB_NAME:-banqmaster}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "About to DROP and recreate database '$DB_NAME' from $BACKUP_FILE"
read -r -p "Type 'RESTORE' to continue: " ANSWER
if [ "$ANSWER" != "RESTORE" ]; then
  echo "Aborted."
  exit 1
fi

docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"

echo "Restore complete."
