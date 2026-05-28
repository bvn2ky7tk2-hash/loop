#!/bin/sh
# Daily pg_dump backup — runs inside PostgreSQL container via cron
BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR"
pg_dump -U loop loop_db > "$BACKUP_DIR/loop-$DATE.sql"
# Keep last 30 days
find "$BACKUP_DIR" -name "loop-*.sql" -mtime +30 -delete
echo "Backup completed: $BACKUP_DIR/loop-$DATE.sql"
