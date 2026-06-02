-- Hồ sơ HR đầy đủ: liên hệ khẩn cấp, y tế, giám hộ, SĐT phụ
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "secondary_phone"            TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_contact_name"     TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_contact_phone"    TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_contact_relation" TEXT,
  ADD COLUMN IF NOT EXISTS "blood_type"                 TEXT,
  ADD COLUMN IF NOT EXISTS "health_note"                TEXT,
  ADD COLUMN IF NOT EXISTS "guardian_name"              TEXT;
