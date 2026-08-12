#!/usr/bin/env bash
# Nightly database backup. Forum posts, profiles and RSVPs cannot be re-derived
# from the Google Sheets, so this is the only copy of them.
#
# Install on the VPS:
#   0 3 * * * /var/www/osw/scripts/backup-db.sh >> /var/log/osw-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/osw}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%F-%H%M)"

mkdir -p "$BACKUP_DIR"

cd "$(dirname "$0")/.."
docker compose exec -T db pg_dump -U osw -Fc osw | gzip > "$BACKUP_DIR/osw-$STAMP.dump.gz"

find "$BACKUP_DIR" -name 'osw-*.dump.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written to $BACKUP_DIR/osw-$STAMP.dump.gz"

# A backup on the same disk as the database is not a backup. Copy it off-box,
# e.g.:  rclone copy "$BACKUP_DIR" remote:osw-backups --max-age 24h
