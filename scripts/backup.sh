#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Backup do banco SQLite da NATA STUDIOS (rodar na VPS).
#  Uso:   ./scripts/backup.sh
#  Cron:  0 3 * * *  /opt/nata-studios/scripts/backup.sh >> /var/log/nata-backup.log 2>&1
# ─────────────────────────────────────────────────────────────
set -euo pipefail

CONTAINER="${CONTAINER:-nata-app}"
BACKUP_DIR="${BACKUP_DIR:-/opt/nata-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

# `.backup` faz uma cópia consistente mesmo com o app escrevendo.
# Fallback para `cp` caso o sqlite3 não exista na imagem.
if docker exec "$CONTAINER" sh -c 'command -v sqlite3' >/dev/null 2>&1; then
  docker exec "$CONTAINER" sqlite3 /data/prod.db ".backup '/data/backup-tmp.db'"
else
  docker exec "$CONTAINER" sh -c "cp /data/prod.db /data/backup-tmp.db"
fi

docker cp "$CONTAINER:/data/backup-tmp.db" "$BACKUP_DIR/nata-$STAMP.db"
docker exec "$CONTAINER" rm -f /data/backup-tmp.db

gzip -f "$BACKUP_DIR/nata-$STAMP.db"
chmod 600 "$BACKUP_DIR/nata-$STAMP.db.gz"

# Retenção
find "$BACKUP_DIR" -name 'nata-*.db.gz' -mtime "+$KEEP_DAYS" -delete

echo "[$(date -Iseconds)] backup OK -> $BACKUP_DIR/nata-$STAMP.db.gz"
