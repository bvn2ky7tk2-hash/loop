#!/bin/bash
# Khôi phục loop_db từ 1 bản backup. Chạy: bash scripts/db-restore.sh <file.dump>
# Không truyền file → dùng bản .dump mới nhất trong backups/
set -e
DB="postgresql://loop:loop_password@localhost:5432/loop_db"
PGRESTORE=$(ls /opt/homebrew/opt/postgresql@*/bin/pg_restore 2>/dev/null | head -1 || which pg_restore)
DIR="$(cd "$(dirname "$0")/.." && pwd)/backups"
FILE="${1:-$(ls -1t "$DIR"/loop_db_*.dump 2>/dev/null | head -1)}"
[ -z "$FILE" ] && { echo "❌ Không tìm thấy file backup"; exit 1; }
echo "⚠️  Khôi phục từ: $FILE → loop_db (--clean, ghi đè data hiện tại)"
read -p "Gõ 'yes' để xác nhận: " ok
[ "$ok" = "yes" ] || { echo "Hủy."; exit 0; }
"$PGRESTORE" -d "$DB" --clean --if-exists --no-owner --no-privileges "$FILE" 2>&1 | grep -iE "error" | grep -ivE "does not exist|already exists" || true
echo "✅ Khôi phục xong."
