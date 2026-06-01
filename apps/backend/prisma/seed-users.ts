/**
 * Seed 500 Users + Employees + Contracts
 * Chạy: cd apps/backend && npx ts-node prisma/seed-users.ts
 */
import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

const DB_URL =
  process.env['DATABASE_URL'] ||
  'postgresql://loop:loop_password@localhost:5432/loop_db';

// ─── Họ & Tên tiếng Việt thực tế ─────────────────────────────────────────────
const HO = [
  'Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng',
  'Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Trịnh','Đào','Mai',
  'Tô','Lưu','Tạ','Cao','Thái','Hà','Trương','Lâm','Diệp','Tiêu',
];
const TEN_DEM_NAM = [
  'Văn','Hữu','Đức','Trung','Minh','Thành','Quốc','Tuấn','Bảo','Hùng',
  'Khoa','Tiến','Quang','Thanh','Phú','Long','Duy','Anh','Gia','Nhật',
];
const TEN_CHINH_NAM = [
  'An','Bình','Cường','Dũng','Đạt','Hải','Hào','Hiếu','Hòa','Huy',
  'Khoa','Khôi','Lâm','Long','Luân','Minh','Nam','Nghĩa','Phát','Phong',
  'Quân','Quang','Sơn','Tài','Thắng','Thiện','Tùng','Tuấn','Vinh','Vũ',
  'Đông','Khải','Liêm','Mạnh','Nhân','Phúc','Tâm','Trí','Xuân','Việt',
];
const TEN_DEM_NU = [
  'Thị','Ngọc','Thúy','Thu','Bích','Kim','Mỹ','Hồng','Lan','Phương',
];
const TEN_CHINH_NU = [
  'Anh','Chi','Dung','Giang','Hà','Hằng','Hiền','Hoa','Hương','Lan',
  'Linh','Loan','Mai','Nga','Ngân','Ngọc','Nhi','Phương','Quyên','Trang',
  'Trinh','Uyên','Vân','Yến','Thanh','Thảo','Thư','Tuyết','Xuân','Hạnh',
];

let nameCounter = 0;
function generateName(gender: 'male' | 'female'): string {
  const ho = HO[nameCounter % HO.length];
  if (gender === 'male') {
    const dem = TEN_DEM_NAM[nameCounter % TEN_DEM_NAM.length];
    const chinh = TEN_CHINH_NAM[Math.floor(nameCounter / HO.length) % TEN_CHINH_NAM.length];
    nameCounter++;
    return `${ho} ${dem} ${chinh}`;
  } else {
    const dem = TEN_DEM_NU[nameCounter % TEN_DEM_NU.length];
    const chinh = TEN_CHINH_NU[Math.floor(nameCounter / HO.length) % TEN_CHINH_NU.length];
    nameCounter++;
    return `${ho} ${dem} ${chinh}`;
  }
}

function nameToEmail(name: string, index: number): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(Boolean);
  const parts = normalized.join('.');
  return `${parts}${index}@loop.vn`;
}

function randomDate(yearsAgo: number, maxYearsAgo: number): Date {
  const now = new Date('2026-05-31');
  const minMs = yearsAgo * 365 * 24 * 3600 * 1000;
  const maxMs = maxYearsAgo * 365 * 24 * 3600 * 1000;
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Date(now.getTime() - ms);
}

function randomPhone(): string {
  const prefixes = ['09','08','07','03','05'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const rest = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + rest;
}

function randomSalary(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) / 1_000_000) * 1_000_000;
}

interface OrgInfo {
  id: string;
  code: string;
  name: string;
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('=== Bắt đầu seed 500 Users + Employees + Contracts ===\n');

  // ── 1. Lấy tenant ─────────────────────────────────────────────────────────
  const tenantRes = await client.query('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1');
  if (tenantRes.rows.length === 0) throw new Error('Chưa có tenant. Hãy chạy seed-org.ts trước.');
  const tenantId: string = tenantRes.rows[0].id;
  console.log(`✓ Tenant: ${tenantId}`);

  // ── 2. Lấy danh sách org units ────────────────────────────────────────────
  const orgRes = await client.query(
    'SELECT id, code, name, level FROM org_units WHERE tenant_id = $1 ORDER BY level, code',
    [tenantId],
  );
  const allOrgs: (OrgInfo & { level: number })[] = orgRes.rows;
  const orgByCode: Record<string, string> = {};
  for (const o of allOrgs) orgByCode[o.code] = o.id;

  console.log(`✓ Tìm thấy ${allOrgs.length} org units`);

  // Lấy ID các org cụ thể
  const lhId = orgByCode['LH'] ?? allOrgs.find(o => o.level === 1)?.id;
  const ltId = orgByCode['LT'];
  const lsId = orgByCode['LS'];
  const lfId = orgByCode['LF'];
  const loId = orgByCode['LO'];

  if (!lhId) throw new Error('Không tìm thấy org LH. Hãy chạy seed-org.ts trước.');

  // Lấy org level 4 (phòng ban) để phân bổ nhân viên
  const l4Orgs = allOrgs.filter(o => o.level === 4);
  const l3Orgs = allOrgs.filter(o => o.level === 3);
  const l2Orgs = allOrgs.filter(o => o.level === 2);

  // ── 3. Lấy hoặc tạo JobTitle + Position ──────────────────────────────────
  async function upsertJobTitle(code: string, name: string, band: string): Promise<string> {
    const existing = await client.query('SELECT id FROM job_titles WHERE code = $1', [code]);
    if (existing.rows.length > 0) return existing.rows[0].id as string;
    const id = randomUUID();
    await client.query(
      `INSERT INTO job_titles (id, code, name, band, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
      [id, code, name, band],
    );
    return id;
  }

  async function upsertPosition(code: string, jobTitleId: string, orgUnitId: string, headcount: number, isHead: boolean): Promise<string> {
    const existing = await client.query('SELECT id FROM positions WHERE code = $1', [code]);
    if (existing.rows.length > 0) return existing.rows[0].id as string;
    const id = randomUUID();
    await client.query(
      `INSERT INTO positions (id, code, job_title_id, org_unit_id, headcount, is_head, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
      [id, code, jobTitleId, orgUnitId, headcount, isHead],
    );
    return id;
  }

  // Tạo chức danh
  const jtCeo      = await upsertJobTitle('JT-CEO',       'Tổng Giám đốc (CEO)',              'C-LEVEL');
  const jtCfo      = await upsertJobTitle('JT-CFO',       'Giám đốc Tài chính (CFO)',          'C-LEVEL');
  const jtCto      = await upsertJobTitle('JT-CTO',       'Giám đốc Công nghệ (CTO)',          'C-LEVEL');
  const jtChro     = await upsertJobTitle('JT-CHRO',      'Giám đốc Nhân sự (CHRO)',           'C-LEVEL');
  const jtCmo      = await upsertJobTitle('JT-CMO',       'Giám đốc Marketing (CMO)',          'C-LEVEL');
  const jtCoo      = await upsertJobTitle('JT-COO',       'Giám đốc Vận hành (COO)',           'C-LEVEL');
  const jtMdSub    = await upsertJobTitle('JT-MD-SUB',    'Tổng Giám đốc Công ty thành viên', 'C-LEVEL');
  const jtDirector = await upsertJobTitle('JT-DIRECTOR',  'Giám đốc Khối',                    'DIRECTOR');
  const jtManager  = await upsertJobTitle('JT-MANAGER',   'Trưởng phòng',                     'MANAGER');
  const jtSenior   = await upsertJobTitle('JT-SENIOR',    'Chuyên viên cao cấp',               'SENIOR');
  const jtStaff    = await upsertJobTitle('JT-STAFF',     'Nhân viên',                         'STAFF');

  console.log('✓ Đã tạo/kiểm tra 11 chức danh');

  // Tạo position cho CEO tổng (LH)
  const posCeo = await upsertPosition('POS-CEO-LH', jtCeo, lhId, 1, true);
  const posCfo = lhId ? await upsertPosition('POS-CFO-LH', jtCfo, lhId, 1, false) : posCeo;
  const posCto = lhId ? await upsertPosition('POS-CTO-LH', jtCto, lhId, 1, false) : posCeo;
  const posChro = lhId ? await upsertPosition('POS-CHRO-LH', jtChro, lhId, 1, false) : posCeo;
  const posCmo = lhId ? await upsertPosition('POS-CMO-LH', jtCmo, lhId, 1, false) : posCeo;
  const posCoo = lhId ? await upsertPosition('POS-COO-LH', jtCoo, lhId, 1, false) : posCeo;

  // Position CEO công ty thành viên (tạo cho mỗi L2)
  const subCeoPositions: Record<string, string> = {};
  for (const l2 of l2Orgs) {
    const posId = await upsertPosition(`POS-MD-${l2.code}`, jtMdSub, l2.id, 1, true);
    subCeoPositions[l2.code] = posId;
  }

  // Position Director cho L3
  const directorPositions: Record<string, string> = {};
  for (const l3 of l3Orgs) {
    const posId = await upsertPosition(`POS-DIR-${l3.code}`, jtDirector, l3.id, 1, true);
    directorPositions[l3.code] = posId;
  }

  // Position Manager cho L4
  const managerPositions: Record<string, string> = {};
  for (const l4 of l4Orgs) {
    const posId = await upsertPosition(`POS-MGR-${l4.code}`, jtManager, l4.id, 1, true);
    managerPositions[l4.code] = posId;
  }

  // Position Senior & Staff dùng chung theo orgUnit
  async function getOrCreateSeniorPos(orgId: string, orgCode: string): Promise<string> {
    return upsertPosition(`POS-SR-${orgCode}`, jtSenior, orgId, 10, false);
  }
  async function getOrCreateStaffPos(orgId: string, orgCode: string): Promise<string> {
    return upsertPosition(`POS-ST-${orgCode}`, jtStaff, orgId, 50, false);
  }

  console.log('✓ Đã tạo/kiểm tra positions');

  // ── 4. Hash password ──────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Loop@2026', 12);

  // ── 5. Lấy LeaveType để tạo LeaveBalance ─────────────────────────────────
  const leaveTypeRes = await client.query(
    "SELECT id FROM leave_types WHERE name ILIKE '%năm%' OR name ILIKE '%annual%' LIMIT 1",
  );
  let annualLeaveTypeId: string | null =
    leaveTypeRes.rows.length > 0 ? leaveTypeRes.rows[0].id : null;

  // Nếu chưa có, tạo leave type mặc định
  if (!annualLeaveTypeId) {
    annualLeaveTypeId = randomUUID();
    await client.query(
      `INSERT INTO leave_types (id, name, max_days_per_year, is_paid, color, is_active, annual_days, max_carry_over, created_at)
       VALUES ($1, 'Nghỉ phép năm', 15, true, '#2563EB', true, 15, 5, NOW())
       ON CONFLICT (name) DO NOTHING`,
      [annualLeaveTypeId],
    );
    // Lấy lại ID (có thể đã tồn tại)
    const r = await client.query("SELECT id FROM leave_types WHERE name = 'Nghỉ phép năm' LIMIT 1");
    annualLeaveTypeId = r.rows[0].id as string;
  }
  console.log(`✓ LeaveType: ${annualLeaveTypeId}`);

  // ── 6. Helper: Tạo User + Employee + Contract + InsuranceEnrollment + LeaveBalance ──
  let totalUsers = 0;
  let totalEmployees = 0;
  let totalContracts = 0;

  async function checkUserExists(email: string): Promise<boolean> {
    const r = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    return r.rows.length > 0;
  }

  async function createPerson(opts: {
    email: string;
    name: string;
    phone: string;
    gender: 'male' | 'female';
    birthdate: Date;
    role: 'ADMIN' | 'LEADERSHIP' | 'PM' | 'MEMBER';
    orgUnitId: string;
    positionId: string;
    position: string; // tên chức vụ để log
    startDate: Date;
    salaryMonthly: number;
    level: 'EXPERT' | 'SENIOR' | 'MID' | 'JUNIOR';
    employeeCode: string;
    leaveDays: number;
  }) {
    // Kiểm tra email đã tồn tại chưa
    if (await checkUserExists(opts.email)) {
      console.log(`  ⚠ Bỏ qua (đã tồn tại): ${opts.email}`);
      return;
    }

    const userId = randomUUID();
    const employeeId = randomUUID();

    // User
    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, org_unit_id, is_active, tenant_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())`,
      [userId, opts.email, passwordHash, opts.name, opts.role, opts.orgUnitId, tenantId],
    );
    totalUsers++;

    // Employee
    const birthdateStr = opts.birthdate.toISOString().split('T')[0];
    const startDateStr = opts.startDate.toISOString().split('T')[0];
    await client.query(
      `INSERT INTO employees (
        id, code, user_id, org_unit_id, full_name, birthdate, start_date,
        level, employee_status, is_active, position_id, email,
        nationality, tenant_id, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE',true,$9,$10,'Việt Nam',$11,NOW(),NOW())`,
      [
        employeeId, opts.employeeCode, userId, opts.orgUnitId,
        opts.name, birthdateStr, startDateStr,
        opts.level, opts.positionId, opts.email, tenantId,
      ],
    );
    totalEmployees++;

    // Contract ACTIVE
    const contractId = randomUUID();
    await client.query(
      `INSERT INTO contracts (
        id, employee_id, type, status, start_date, salary_monthly, currency,
        signed_at, renewal_count, tenant_id, created_at, updated_at
       ) VALUES ($1,$2,'INDEFINITE','ACTIVE',$3,$4,'VND',$5,0,$6,NOW(),NOW())`,
      [contractId, employeeId, startDateStr, opts.salaryMonthly, startDateStr, tenantId],
    );
    totalContracts++;

    // InsuranceEnrollment ACTIVE (lương đóng bảo hiểm = min(salaryMonthly, 20*baseWage))
    const insuranceSalary = Math.min(opts.salaryMonthly, 46_800_000); // 20x wage base 2024
    await client.query(
      `INSERT INTO insurance_enrollments (
        id, employee_id, insurance_salary, start_date, status, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,'ACTIVE',NOW(),NOW())`,
      [randomUUID(), employeeId, insuranceSalary, startDateStr],
    );

    // LeaveBalance 2026
    await client.query(
      `INSERT INTO leave_balances (
        id, employee_id, leave_type_id, year, total_days, used_days, tenant_id
       ) VALUES ($1,$2,$3,2026,$4,0,$5)
       ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
      [randomUUID(), employeeId, annualLeaveTypeId, opts.leaveDays, tenantId],
    );
  }

  // ── 7. User đặc biệt: Phan Tuấn Anh (Admin/CEO) ──────────────────────────
  console.log('\n[1] Tạo User đặc biệt: Phan Tuấn Anh (admin@loop.vn)...');
  await createPerson({
    email: 'admin@loop.vn',
    name: 'Phan Tuấn Anh',
    phone: '0901234567',
    gender: 'male',
    birthdate: new Date('1985-03-15'),
    role: 'ADMIN',
    orgUnitId: lhId,
    positionId: posCeo,
    position: 'Tổng Giám đốc',
    startDate: new Date('2020-01-01'),
    salaryMonthly: 100_000_000,
    level: 'EXPERT',
    employeeCode: 'EMP-0001',
    leaveDays: 15,
  });

  // ── 8. C-Level còn lại (5 người) ─────────────────────────────────────────
  console.log('[2] Tạo C-Level (CFO, CTO, CHRO, CMO, COO)...');
  const cLevelDefs = [
    { email: 'cfo@loop.vn',  name: 'Trần Minh Tài',     pos: posCfo,  position: 'CFO', sal: 95_000_000 },
    { email: 'cto@loop.vn',  name: 'Lê Đức Khoa',       pos: posCto,  position: 'CTO', sal: 95_000_000 },
    { email: 'chro@loop.vn', name: 'Nguyễn Thị Hương',  pos: posChro, position: 'CHRO', sal: 90_000_000 },
    { email: 'cmo@loop.vn',  name: 'Phạm Thị Lan',      pos: posCmo,  position: 'CMO', sal: 88_000_000 },
    { email: 'coo@loop.vn',  name: 'Hoàng Văn Minh',    pos: posCoo,  position: 'COO', sal: 92_000_000 },
  ];
  for (let i = 0; i < cLevelDefs.length; i++) {
    const d = cLevelDefs[i];
    await createPerson({
      email: d.email,
      name: d.name,
      phone: randomPhone(),
      gender: d.name.includes('Thị') ? 'female' : 'male',
      birthdate: randomDate(35, 50),
      role: 'LEADERSHIP',
      orgUnitId: lhId,
      positionId: d.pos,
      position: d.position,
      startDate: randomDate(3, 6),
      salaryMonthly: d.sal,
      level: 'EXPERT',
      employeeCode: `EMP-${String(i + 2).padStart(4, '0')}`,
      leaveDays: 15,
    });
  }

  // ── 9. CEO 4 công ty thành viên (4 người) ────────────────────────────────
  console.log('[3] Tạo CEO 4 công ty thành viên...');
  const subCompanyCeos = [
    { code: 'LT', name: 'Vũ Quốc Tuấn',    email: 'md.lt@loop.vn', sal: 85_000_000 },
    { code: 'LS', name: 'Đặng Hữu Long',   email: 'md.ls@loop.vn', sal: 82_000_000 },
    { code: 'LF', name: 'Bùi Thị Ngân',    email: 'md.lf@loop.vn', sal: 82_000_000 },
    { code: 'LO', name: 'Đỗ Văn Phát',     email: 'md.lo@loop.vn', sal: 80_000_000 },
  ];
  for (let i = 0; i < subCompanyCeos.length; i++) {
    const d = subCompanyCeos[i];
    const orgId = orgByCode[d.code] ?? lhId;
    const posId = subCeoPositions[d.code] ?? posCeo;
    await createPerson({
      email: d.email,
      name: d.name,
      phone: randomPhone(),
      gender: d.name.includes('Thị') ? 'female' : 'male',
      birthdate: randomDate(32, 48),
      role: 'LEADERSHIP',
      orgUnitId: orgId,
      positionId: posId,
      position: `CEO ${d.code}`,
      startDate: randomDate(2, 5),
      salaryMonthly: d.sal,
      level: 'EXPERT',
      employeeCode: `EMP-${String(7 + i).padStart(4, '0')}`,
      leaveDays: 15,
    });
  }

  // ── 10. Directors (20 người — L3 orgs) ───────────────────────────────────
  console.log('[4] Tạo Directors (20 người)...');
  const directorNames = [
    'Nguyễn Thành Đạt','Trần Văn Hải','Lê Minh Quang','Phạm Hữu Hùng',
    'Hoàng Tuấn Anh','Huỳnh Đức Thắng','Phan Bảo Nam','Vũ Quang Khải',
    'Võ Tiến Dũng','Đặng Việt Hào','Bùi Minh Phú','Đỗ Thị Loan',
    'Hồ Thúy Phương','Ngô Thị Linh','Dương Văn Trí','Lý Hữu Tâm',
    'Đinh Minh Nhân','Trịnh Bích Ngọc','Đào Thị Lan','Mai Thị Hằng',
  ];
  const directorL3 = l3Orgs.slice(0, Math.min(l3Orgs.length, 20));
  for (let i = 0; i < 20; i++) {
    const orgNode = directorL3[i % directorL3.length];
    const fullName = directorNames[i];
    const posId = directorPositions[orgNode.code] ?? await getOrCreateSeniorPos(orgNode.id, orgNode.code);
    await createPerson({
      email: nameToEmail(fullName, 100 + i),
      name: fullName,
      phone: randomPhone(),
      gender: fullName.includes('Thị') || fullName.includes('Bích') || fullName.includes('Thúy') ? 'female' : 'male',
      birthdate: randomDate(30, 45),
      role: 'LEADERSHIP',
      orgUnitId: orgNode.id,
      positionId: posId,
      position: 'Director',
      startDate: randomDate(2, 5),
      salaryMonthly: randomSalary(40_000_000, 60_000_000),
      level: 'EXPERT',
      employeeCode: `EMP-${String(11 + i).padStart(4, '0')}`,
      leaveDays: 15,
    });
  }

  // ── 11. Managers (50 người — L4 orgs) ────────────────────────────────────
  console.log('[5] Tạo Managers (50 người)...');
  const l4OrgList = l4Orgs.length > 0 ? l4Orgs : l3Orgs;
  for (let i = 0; i < 50; i++) {
    const orgNode = l4OrgList[i % l4OrgList.length];
    const gender = i % 3 === 0 ? 'female' : 'male';
    const fullName = generateName(gender);
    const posId = managerPositions[orgNode.code] ?? await getOrCreateSeniorPos(orgNode.id, orgNode.code);
    await createPerson({
      email: nameToEmail(fullName, 200 + i),
      name: fullName,
      phone: randomPhone(),
      gender,
      birthdate: randomDate(28, 42),
      role: 'PM',
      orgUnitId: orgNode.id,
      positionId: posId,
      position: 'Manager',
      startDate: randomDate(1, 4),
      salaryMonthly: randomSalary(20_000_000, 35_000_000),
      level: 'SENIOR',
      employeeCode: `EMP-${String(31 + i).padStart(4, '0')}`,
      leaveDays: i < 25 ? 14 : 13,
    });
  }

  // ── 12. Seniors (80 người) ────────────────────────────────────────────────
  console.log('[6] Tạo Seniors (80 người)...');
  for (let i = 0; i < 80; i++) {
    const orgNode = l4OrgList[i % l4OrgList.length];
    const gender = i % 4 === 0 ? 'female' : 'male';
    const fullName = generateName(gender);
    const posId = await getOrCreateSeniorPos(orgNode.id, orgNode.code);
    await createPerson({
      email: nameToEmail(fullName, 300 + i),
      name: fullName,
      phone: randomPhone(),
      gender,
      birthdate: randomDate(25, 38),
      role: 'MEMBER',
      orgUnitId: orgNode.id,
      positionId: posId,
      position: 'Senior',
      startDate: randomDate(1, 3),
      salaryMonthly: randomSalary(12_000_000, 20_000_000),
      level: 'SENIOR',
      employeeCode: `EMP-${String(81 + i).padStart(4, '0')}`,
      leaveDays: i < 40 ? 13 : 12,
    });
  }

  // ── 13. Staff (340 người) ─────────────────────────────────────────────────
  console.log('[7] Tạo Staff (340 người)...');
  // Lấy tất cả các org (L4 ưu tiên, nếu không đủ thì L3, L5)
  const allLeafOrgs = [
    ...l4Orgs,
    ...allOrgs.filter(o => o.level === 5),
    ...l3Orgs,
  ];
  const staffOrgs = allLeafOrgs.length > 0 ? allLeafOrgs : allOrgs;
  for (let i = 0; i < 340; i++) {
    const orgNode = staffOrgs[i % staffOrgs.length];
    const gender = i % 3 === 1 ? 'female' : 'male';
    const fullName = generateName(gender);
    const posId = await getOrCreateStaffPos(orgNode.id, orgNode.code);
    await createPerson({
      email: nameToEmail(fullName, 400 + i),
      name: fullName,
      phone: randomPhone(),
      gender,
      birthdate: randomDate(22, 35),
      role: 'MEMBER',
      orgUnitId: orgNode.id,
      positionId: posId,
      position: 'Staff',
      startDate: randomDate(0.5, 2),
      salaryMonthly: randomSalary(8_000_000, 15_000_000),
      level: i % 3 === 0 ? 'MID' : 'JUNIOR',
      employeeCode: `EMP-${String(161 + i).padStart(4, '0')}`,
      leaveDays: 12,
    });
    if (i % 50 === 49) console.log(`  ... đã tạo ${i + 1}/340 staff`);
  }

  // ── 14. Report ─────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('REPORT — Kết quả seed:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const [uCount, eCount, cCount, iCount, lbCount] = await Promise.all([
    client.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]),
    client.query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1', [tenantId]),
    client.query('SELECT COUNT(*) FROM contracts WHERE tenant_id = $1', [tenantId]),
    client.query('SELECT COUNT(*) FROM insurance_enrollments ie JOIN employees e ON ie.employee_id = e.id WHERE e.tenant_id = $1', [tenantId]),
    client.query('SELECT COUNT(*) FROM leave_balances WHERE tenant_id = $1', [tenantId]),
  ]);

  console.log(`  Tổng Users (trong tenant)         : ${uCount.rows[0].count}`);
  console.log(`  Tổng Employees (trong tenant)     : ${eCount.rows[0].count}`);
  console.log(`  Tổng Contracts (trong tenant)     : ${cCount.rows[0].count}`);
  console.log(`  Tổng InsuranceEnrollments         : ${iCount.rows[0].count}`);
  console.log(`  Tổng LeaveBalances 2026           : ${lbCount.rows[0].count}`);
  console.log(`\n  Trong phiên seed này:`);
  console.log(`    + Users mới tạo     : ${totalUsers}`);
  console.log(`    + Employees mới tạo : ${totalEmployees}`);
  console.log(`    + Contracts mới tạo : ${totalContracts}`);
  console.log('\n✅ Seed hoàn tất!');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Lỗi seed-users:', err);
  process.exit(1);
});
