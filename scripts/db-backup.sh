#!/bin/bash
# Backup nhanh loop_db. Chạy: bash scripts/db-backup.sh [label]
set -e
DB="postgresql://loop:loop_password@localhost:5432/loop_db"
PGDUMP=$(ls /opt/homebrew/opt/postgresql@*/bin/pg_dump 2>/dev/null | head -1 || which pg_dump)
DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
mkdir -p "$DIR"
LABEL="${1:-manual}"
TS=$(date +%Y%m%d_%H%M%S)
OUT="$DIR/loop_db_${TS}_${LABEL}.dump"
"$PGDUMP" "$DB" -Fc -f "$OUT"
echo "✅ Backup: $OUT ($(du -h "$OUT" | cut -f1))"
# Giữ tối đa 15 bản gần nhất
ls -1t "$DIR"/loop_db_*.dump 2>/dev/null | tail -n +16 | xargs -I{} rm -f {} 2>/dev/null || true
