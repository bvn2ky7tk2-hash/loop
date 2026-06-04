#!/bin/sh
set -e

# Đồng bộ schema bằng `db push` (KHÔNG --accept-data-loss) thay cho `migrate deploy`
# (history migration bị drift → migrate deploy hỏng trên DB mới). db push:
#  - thay đổi ADDITIVE (thêm bảng/cột/index) → áp tự động;
#  - thay đổi PHÁ HỦY (drop) → LỖI an toàn (container thoát) thay vì âm thầm mất dữ liệu
#    → người vận hành xem lại (xem DEPLOYMENT.md). Index go-live đã nằm trong schema → tự tạo.
echo "Syncing database schema (prisma db push)..."
node node_modules/.bin/prisma db push

echo "Starting application..."
exec node dist/src/main
