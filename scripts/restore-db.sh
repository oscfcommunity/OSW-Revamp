#!/usr/bin/env bash
# Restore a dump produced by backup-db.sh. Test this at least once before you
# need it: an untested restore is a hope, not a backup.
#
#   ./scripts/restore-db.sh /var/backups/osw/osw-2026-08-12-0300.dump.gz
set -euo pipefail

DUMP="${1:-}"
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "Usage: $0 <path-to-dump.gz>" >&2
  exit 1
fi

echo "This REPLACES the current contents of the osw database with $DUMP."
read -r -p "Type 'restore' to continue: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "Aborted."; exit 1; }

cd "$(dirname "$0")/.."
gunzip -c "$DUMP" | docker compose exec -T db pg_restore -U osw -d osw --clean --if-exists

echo "Restore complete."
