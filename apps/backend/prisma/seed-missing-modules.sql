-- Seed data thực tế cho các module còn trống (derive từ data có sẵn, KHÔNG mock rời rạc)
BEGIN;

-- 1. POSITIONS: mỗi job_title → 1 vị trí, gắn org_unit thực (round-robin), headcount theo thực tế
INSERT INTO positions (id, code, job_title_id, org_unit_id, headcount, description, is_active, updated_at, created_at)
SELECT gen_random_uuid()::text,
       'POS-' || lpad((row_number() OVER (ORDER BY jt.name))::text, 3, '0'),
       jt.id,
       (ARRAY(SELECT id FROM org_units WHERE parent_id IS NOT NULL ORDER BY id))[1 + (row_number() OVER (ORDER BY jt.name))::int % GREATEST((SELECT count(*) FROM org_units WHERE parent_id IS NOT NULL),1)],
       (2 + floor(random()*8))::int,
       'Vị trí ' || jt.name,
       true, NOW(), NOW()
FROM job_titles jt
WHERE NOT EXISTS (SELECT 1 FROM positions);

-- 2. SALARY_BANDS: mỗi vị trí 1 dải lương theo cấp (min/mid/max hợp lý VNĐ)
INSERT INTO salary_bands (id, position_id, min_salary, mid_salary, max_salary, currency, effective_from, created_at)
SELECT gen_random_uuid()::text, p.id,
       base, base*1.35, base*1.8, 'VND', '2025-01-01', NOW()
FROM (
  SELECT id, (10000000 + floor(random()*5)*5000000)::numeric AS base FROM positions
) p
WHERE NOT EXISTS (SELECT 1 FROM salary_bands);

-- 3. LEAVE_BALANCES: mỗi NV × loại nghỉ có hạn mức, năm 2026
INSERT INTO leave_balances (id, employee_id, leave_type_id, year, total_days, used_days, entitlement_days)
SELECT gen_random_uuid()::text, e.id, lt.id, 2026,
       COALESCE(lt.max_days_per_year, 12),
       floor(random() * LEAST(COALESCE(lt.max_days_per_year,12), 6))::numeric,
       COALESCE(lt.max_days_per_year, 12)
FROM employees e
CROSS JOIN leave_types lt
WHERE lt.is_active AND COALESCE(lt.max_days_per_year,0) > 0 AND e.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM leave_balances);

-- 4. EMPLOYEE_SKILLS: mỗi NV 3 kỹ năng ngẫu nhiên, level phân bố thực
INSERT INTO employee_skills (id, employee_id, skill_id, level, years_exp, updated_at)
SELECT gen_random_uuid()::text, x.emp_id, x.skill_id,
       (ARRAY['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']::skill_level[])[1 + floor(random()*4)::int],
       round((random()*8)::numeric, 1), NOW()
FROM (
  SELECT e.id AS emp_id, s.id AS skill_id,
         row_number() OVER (PARTITION BY e.id ORDER BY random()) AS rn
  FROM employees e CROSS JOIN skills s
  WHERE e.deleted_at IS NULL
) x
WHERE x.rn <= 3 AND NOT EXISTS (SELECT 1 FROM employee_skills);

-- 5. INSURANCE_ENROLLMENTS: mỗi NV active, mức đóng theo lương
INSERT INTO insurance_enrollments (id, employee_id, bhxh_book_number, insurance_salary, start_date, status, created_at, updated_at)
SELECT gen_random_uuid()::text, e.id,
       'BH' || lpad((row_number() OVER (ORDER BY e.code))::text, 7, '0'),
       (8000000 + floor(random()*12)*1000000)::numeric,
       COALESCE(e.start_date, '2024-01-01'), 'ACTIVE', NOW(), NOW()
FROM employees e
WHERE e.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM insurance_enrollments);

-- 6. SOCIAL_INSURANCE_BOOKS: sổ BHXH cho NV đã enroll
INSERT INTO social_insurance_books (id, employee_id, enrollment_id, book_number, issue_date, issue_authority, received_by_employee, updated_at, created_at)
SELECT gen_random_uuid()::text, ie.employee_id, ie.id, ie.bhxh_book_number,
       ie.start_date, 'BHXH TP. Hồ Chí Minh', (random() < 0.7), NOW(), NOW()
FROM insurance_enrollments ie
WHERE NOT EXISTS (SELECT 1 FROM social_insurance_books);

-- 7. BUDGET_PLANS: mỗi phòng ban 1 kế hoạch ngân sách 2026
INSERT INTO budget_plans (id, name, fiscal_year, type, status, org_unit_id, total_amount, note, created_by_id, updated_at, created_at)
SELECT gen_random_uuid()::text,
       'Ngân sách 2026 - ' || o.name, 2026, 'DEPARTMENT',
       (ARRAY['ACTIVE','PENDING_APPROVAL','DRAFT']::budget_plan_status[])[1 + floor(random()*3)::int],
       o.id, (500000000 + floor(random()*20)*100000000)::numeric,
       'Ngân sách hoạt động năm 2026',
       (SELECT id FROM users WHERE email='admin@loop.vn'), NOW(), NOW()
FROM org_units o WHERE o.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM budget_plans);

-- 8. BUDGET_LINES: 4 hạng mục/kế hoạch
INSERT INTO budget_lines (id, plan_id, category, description, allocated_amount, used_amount, committed_amount, alert_threshold, updated_at, created_at)
SELECT gen_random_uuid()::text, bp.id, c.category, c.descr,
       (bp.total_amount * c.pct)::numeric,
       (bp.total_amount * c.pct * random() * 0.6)::numeric,
       (bp.total_amount * c.pct * random() * 0.2)::numeric,
       80, NOW(), NOW()
FROM budget_plans bp
CROSS JOIN (VALUES
  ('Nhân sự','Lương & phúc lợi', 0.5),
  ('Vận hành','Chi phí vận hành', 0.25),
  ('Marketing','Quảng cáo & sự kiện', 0.15),
  ('Thiết bị','Mua sắm thiết bị', 0.10)
) AS c(category, descr, pct)
WHERE NOT EXISTS (SELECT 1 FROM budget_lines);

-- 9. LEADS: từ contacts thực, gán sales (PM/MEMBER), giá trị ước tính
INSERT INTO leads (id, title, contact_id, source, status, estimated_value, currency, assignee_id, notes, updated_at, created_at)
SELECT gen_random_uuid()::text,
       'Cơ hội: ' || c.name,
       c.id,
       (ARRAY['WEBSITE','REFERRAL','SOCIAL','EVENT','COLD_OUTREACH','OTHER']::lead_source[])[1 + floor(random()*6)::int],
       (ARRAY['NEW','CONTACTED','QUALIFIED','CONVERTED','LOST']::lead_status[])[1 + floor(random()*5)::int],
       (50000000 + floor(random()*50)*10000000)::numeric, 'VND',
       (SELECT id FROM users WHERE role IN ('PM','LEADERSHIP') ORDER BY random() LIMIT 1),
       'Khách hàng tiềm năng từ kênh tiếp cận', NOW(), NOW()
FROM contacts c
WHERE NOT EXISTS (SELECT 1 FROM leads);

-- 10. CLIENT_CONTRACTS: hợp đồng từ customers thực
INSERT INTO client_contracts (id, contract_no, title, customer_id, type, value, currency, start_date, end_date, signed_at, status, payment_terms_days, updated_at, created_at)
SELECT gen_random_uuid()::text,
       'HĐKH-2026-' || lpad((row_number() OVER (ORDER BY cu.id))::text,3,'0'),
       'Hợp đồng dịch vụ - ' || cu.name,
       cu.id,
       (ARRAY['SERVICE','PRODUCT','SUPPORT','SLA','OTHER']::client_contract_type[])[1 + floor(random()*5)::int],
       (200000000 + floor(random()*30)*50000000)::numeric, 'VND',
       '2026-01-01', '2026-12-31', '2025-12-20',
       (ARRAY['ACTIVE','DRAFT','COMPLETED']::client_contract_status[])[1 + floor(random()*3)::int],
       30, NOW(), NOW()
FROM customers cu
WHERE NOT EXISTS (SELECT 1 FROM client_contracts);

-- 11. CRM_ACTIVITIES: nhật ký hoạt động từ customers
INSERT INTO crm_activities (id, type, subject, content, customer_id, completed_at, created_by_id, updated_at, created_at)
SELECT gen_random_uuid()::text,
       (ARRAY['CALL','EMAIL','MEETING','NOTE','DEMO','SITE_VISIT']::text[])[1 + floor(random()*6)::int]::activity_type,
       a.subject, a.content, cu.id,
       NOW() - (floor(random()*60)||' days')::interval,
       (SELECT id FROM users WHERE role IN ('PM','LEADERSHIP') ORDER BY random() LIMIT 1),
       NOW(), NOW()
FROM customers cu
CROSS JOIN (VALUES
  ('Gọi điện chăm sóc','Trao đổi nhu cầu mở rộng dịch vụ'),
  ('Gửi báo giá','Đã gửi báo giá gói dịch vụ Q1/2026'),
  ('Họp đánh giá','Họp review tiến độ dự án')
) AS a(subject, content)
WHERE NOT EXISTS (SELECT 1 FROM crm_activities);

COMMIT;
