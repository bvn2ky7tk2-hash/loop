-- Migration: Thêm chế độ tính phụ cấp (cố định / theo ngày công)

-- 1. Tạo enum chế độ tính
CREATE TYPE "allowance_calculation_mode" AS ENUM ('FIXED', 'PER_WORK_DAY');

-- 2. Thêm cột vào bảng allowance_types
ALTER TABLE "allowance_types"
  ADD COLUMN IF NOT EXISTS "calculation_mode" "allowance_calculation_mode" NOT NULL DEFAULT 'FIXED';
