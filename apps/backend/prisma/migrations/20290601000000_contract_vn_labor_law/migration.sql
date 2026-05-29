-- Migration: Cập nhật loại hợp đồng theo Bộ luật Lao động Việt Nam 2019 (Điều 20)
-- + Bổ sung tracking gia hạn hợp đồng

-- 1. Tạo enum mới với đầy đủ loại HĐ theo luật VN
CREATE TYPE "contract_type_new" AS ENUM (
  'PROBATION',
  'FIXED_12',
  'FIXED_24',
  'FIXED_36',
  'INDEFINITE',
  'PART_TIME',
  'SEASONAL'
);

-- 2. Xoá DEFAULT trước khi đổi kiểu cột (PostgreSQL yêu cầu)
ALTER TABLE "contracts" ALTER COLUMN "type" DROP DEFAULT;

-- 3. Migrate dữ liệu cũ sang enum mới
--    FULL_TIME  → INDEFINITE (HĐ toàn thời gian = không xác định thời hạn)
--    FREELANCE  → SEASONAL   (Freelance ≈ thời vụ/công việc cụ thể)
--    PROBATION  → PROBATION  (giữ nguyên)
--    PART_TIME  → PART_TIME  (giữ nguyên)
ALTER TABLE "contracts"
  ALTER COLUMN "type" TYPE "contract_type_new"
  USING (
    CASE "type"::text
      WHEN 'FULL_TIME'  THEN 'INDEFINITE'
      WHEN 'FREELANCE'  THEN 'SEASONAL'
      WHEN 'PROBATION'  THEN 'PROBATION'
      WHEN 'PART_TIME'  THEN 'PART_TIME'
      ELSE 'INDEFINITE'
    END
  )::"contract_type_new";

-- 4. Đặt lại DEFAULT value với enum mới
ALTER TABLE "contracts"
  ALTER COLUMN "type" SET DEFAULT 'INDEFINITE'::"contract_type_new";

-- 5. Xoá enum cũ và đặt tên enum mới
DROP TYPE "contract_type";
ALTER TYPE "contract_type_new" RENAME TO "contract_type";

-- 6. Thêm cột theo dõi gia hạn hợp đồng
ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "renewal_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "previous_contract_id" TEXT;

-- 7. Foreign key tự tham chiếu (contract → previousContract)
ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_previous_contract_id_fkey"
  FOREIGN KEY ("previous_contract_id")
  REFERENCES "contracts"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- 8. Index cho tra cứu gia hạn
CREATE INDEX IF NOT EXISTS "contracts_previous_contract_id_idx"
  ON "contracts"("previous_contract_id");
