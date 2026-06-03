-- ============================================================================
-- Migration M11: Self-service Referral — nhân viên giới thiệu ứng viên
-- Thêm cột Candidate.referredById (→ Employee) để truy vết ai giới thiệu.
--
-- ⚠️ CHƯA ĐƯỢC APPLY. Đây là thay đổi ADDITIVE an toàn (cột nullable + index + FK
--    ON DELETE SET NULL) — KHÔNG rewrite dữ liệu, KHÔNG khóa bảng lâu.
--
-- CÁCH APPLY (theo CLAUDE.md §8.1):
--   1. bash scripts/db-backup.sh                         # BẮT BUỘC backup trước
--   2. psql "$DATABASE_URL" --single-transaction -f \
--        prisma/manual-migrations/2026-06-03-candidate-referral.sql
--   3. npx prisma migrate resolve --applied <migration_name>   # ghi history (nếu dùng)
--
-- Schema prisma đã cập nhật tương ứng (Candidate.referredById + Employee.referredCandidates)
-- và `npx prisma generate` đã chạy → backend đã typecheck với cột mới.
-- ============================================================================

-- 1. Cột nullable (an toàn tuyệt đối — không ảnh hưởng hàng hiện có)
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "referred_by_id" TEXT;

-- 2. Index để lọc "ứng viên do tôi giới thiệu"
CREATE INDEX IF NOT EXISTS "candidates_referred_by_id_idx"
  ON "candidates" ("referred_by_id");

-- 3. Foreign key → employees (SET NULL khi NV bị xóa, giữ lại ứng viên)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidates_referred_by_id_fkey'
  ) THEN
    ALTER TABLE "candidates"
      ADD CONSTRAINT "candidates_referred_by_id_fkey"
      FOREIGN KEY ("referred_by_id") REFERENCES "employees"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK (nếu cần gỡ):
--   ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_referred_by_id_fkey";
--   DROP INDEX IF EXISTS "candidates_referred_by_id_idx";
--   ALTER TABLE "candidates" DROP COLUMN IF EXISTS "referred_by_id";
-- ============================================================================
