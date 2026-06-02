-- Hồ sơ ứng viên đầy đủ
ALTER TABLE "candidates"
  ADD COLUMN IF NOT EXISTS "education_level"     TEXT,
  ADD COLUMN IF NOT EXISTS "address"             TEXT,
  ADD COLUMN IF NOT EXISTS "years_of_experience" INTEGER,
  ADD COLUMN IF NOT EXISTS "current_position"    TEXT,
  ADD COLUMN IF NOT EXISTS "current_company"     TEXT,
  ADD COLUMN IF NOT EXISTS "skills"              TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "birthdate"           DATE;
