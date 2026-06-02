-- Gán gói phép năm theo chức danh + chuẩn hóa bậc thâm niên (cộng dồn +1/5 năm)
-- Chạy: psql "$DATABASE_URL" -f prisma/seed-leave-policy-assignment.sql

-- 1. Bậc thâm niên: +1 ngày mỗi 5 năm (Điều 114 BLLĐ) — cộng dồn từng bậc
UPDATE leave_policies
SET seniority_bonus = '[{"yearsFrom":5,"bonus":1},{"yearsFrom":10,"bonus":1},{"yearsFrom":15,"bonus":1},{"yearsFrom":20,"bonus":1}]'::jsonb;

-- 2. Gán gói phép cho chức danh: mặc định "Phép cơ bản", manager/trưởng → "Phép quản lý"
UPDATE job_titles SET leave_policy_id = (SELECT id FROM leave_policies WHERE name='Phép cơ bản' LIMIT 1)
WHERE leave_policy_id IS NULL;
UPDATE job_titles SET leave_policy_id = (SELECT id FROM leave_policies WHERE name='Phép quản lý' LIMIT 1)
WHERE band ILIKE 'M%' OR name ILIKE '%quản lý%' OR name ILIKE '%trưởng%' OR name ILIKE '%giám đốc%';

-- 3. Gán job_title_id cho employees (round-robin các chức danh đã có gói phép)
WITH jt AS (
  SELECT id, row_number() OVER (ORDER BY id) - 1 AS rn, count(*) OVER () AS total
  FROM job_titles WHERE leave_policy_id IS NOT NULL AND is_active
),
emp AS (SELECT id, row_number() OVER (ORDER BY id) - 1 AS rn FROM employees WHERE deleted_at IS NULL)
UPDATE employees e SET job_title_id = jt.id
FROM emp, jt WHERE e.id = emp.id AND jt.rn = emp.rn % jt.total AND e.job_title_id IS NULL;
