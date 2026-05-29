/**
 * Seed cơ cấu tổ chức Loop: thêm phòng ban, chức danh, vị trí biên chế
 * Chạy: node apps/backend/prisma/seed-hr-structure.js
 */
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

function uid() {
  return require('crypto').randomUUID();
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // ─── 1. Lấy org units hiện có ──────────────────────────────────────────────
  const { rows: existingUnits } = await client.query('SELECT id, name, code FROM org_units');
  const unitMap = {};
  for (const u of existingUnits) unitMap[u.code] = u.id;

  console.log('Org units hiện có:', existingUnits.map(u => u.code).join(', '));

  // ─── 2. Thêm phòng ban còn thiếu ───────────────────────────────────────────
  const rootId = unitMap['ROOT'];
  if (!rootId) throw new Error('Không tìm thấy đơn vị gốc ROOT');

  const now = new Date().toISOString();

  async function upsertUnit(code, name, parentCode) {
    if (unitMap[code]) {
      console.log(`  ↳ ${code} đã tồn tại, bỏ qua`);
      return unitMap[code];
    }
    const parentId = parentCode ? unitMap[parentCode] : null;
    const id = uid();
    await client.query(
      `INSERT INTO org_units (id, name, code, parent_id, level, created_at, updated_at)
       VALUES ($1, $2, $3, $4,
         COALESCE((SELECT level + 1 FROM org_units WHERE id = $4), 0),
         $5, $5)`,
      [id, name, code, parentId, now]
    );
    unitMap[code] = id;
    console.log(`  + ${code}: ${name}`);
    return id;
  }

  console.log('\n--- Thêm phòng ban ---');
  // Cấp 1: Ban/Phòng trực thuộc Công ty
  await upsertUnit('BGD', 'Ban Giám đốc', 'ROOT');
  await upsertUnit('KD', 'Phòng Kinh doanh', 'ROOT');
  await upsertUnit('MKT', 'Phòng Marketing', 'ROOT');
  await upsertUnit('KT', 'Phòng Kế toán', 'ROOT');
  await upsertUnit('CNTT', 'Phòng Công nghệ thông tin', 'ROOT');
  await upsertUnit('HCVP', 'Phòng Hành chính Văn phòng', 'ROOT');

  // Đổi tên DEV thành phòng con của CNTT nếu chưa có cha
  // (giữ nguyên DEV, HRD, FIN - đã tồn tại)

  // Cấp 2: Team con
  await upsertUnit('CNTT-BE', 'Nhóm Backend', 'CNTT');
  await upsertUnit('CNTT-FE', 'Nhóm Frontend', 'CNTT');
  await upsertUnit('CNTT-QA', 'Nhóm QA & Test', 'CNTT');
  await upsertUnit('KD-B2B', 'Nhóm Kinh doanh B2B', 'KD');
  await upsertUnit('KD-B2C', 'Nhóm Kinh doanh B2C', 'KD');

  // ─── 3. Tạo chức danh (job_titles) ─────────────────────────────────────────
  console.log('\n--- Tạo chức danh ---');

  const jobTitles = [
    { code: 'GD', name: 'Giám đốc điều hành', band: 'C-LEVEL' },
    { code: 'PGD', name: 'Phó Giám đốc', band: 'C-LEVEL' },
    { code: 'TP', name: 'Trưởng phòng', band: 'MANAGER' },
    { code: 'PP', name: 'Phó phòng', band: 'MANAGER' },
    { code: 'TN', name: 'Trưởng nhóm', band: 'LEAD' },
    { code: 'KTSC', name: 'Kế toán trưởng', band: 'LEAD' },
    { code: 'NVCN', name: 'Nhân viên Công nghệ', band: 'IC' },
    { code: 'NVKD', name: 'Nhân viên Kinh doanh', band: 'IC' },
    { code: 'NVNS', name: 'Chuyên viên Nhân sự', band: 'IC' },
    { code: 'NVKT', name: 'Kế toán viên', band: 'IC' },
    { code: 'NVHC', name: 'Nhân viên Hành chính', band: 'IC' },
    { code: 'NVMKT', name: 'Chuyên viên Marketing', band: 'IC' },
    { code: 'SE-SR', name: 'Senior Software Engineer', band: 'IC' },
    { code: 'SE-MID', name: 'Software Engineer', band: 'IC' },
    { code: 'SE-JR', name: 'Junior Software Engineer', band: 'IC' },
    { code: 'QA-SR', name: 'Senior QA Engineer', band: 'IC' },
    { code: 'QA-JR', name: 'QA Engineer', band: 'IC' },
  ];

  const jtMap = {};
  // Kiểm tra đã tồn tại
  const { rows: existingJt } = await client.query('SELECT id, code FROM job_titles');
  for (const jt of existingJt) jtMap[jt.code] = jt.id;

  for (const jt of jobTitles) {
    if (jtMap[jt.code]) {
      console.log(`  ↳ ${jt.code} đã tồn tại, bỏ qua`);
      continue;
    }
    const id = uid();
    await client.query(
      `INSERT INTO job_titles (id, code, name, band, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, $5)`,
      [id, jt.code, jt.name, jt.band || null, now]
    );
    jtMap[jt.code] = id;
    console.log(`  + ${jt.code}: ${jt.name}`);
  }

  // ─── 4. Tạo vị trí biên chế (positions) ────────────────────────────────────
  console.log('\n--- Tạo vị trí biên chế ---');

  // [orgUnitCode, posCode, jobTitleCode, headcount, isHead]
  const positions = [
    // Ban Giám đốc
    ['BGD', 'BGD-GD01', 'GD', 1, true],
    ['BGD', 'BGD-PGD01', 'PGD', 2, false],

    // Phòng Nhân sự (HRD)
    ['HRD', 'HRD-TP01', 'TP', 1, true],
    ['HRD', 'HRD-CV01', 'NVNS', 3, false],

    // Phòng Tài chính (FIN)
    ['FIN', 'FIN-TP01', 'TP', 1, true],
    ['FIN', 'FIN-KT01', 'KTSC', 1, false],
    ['FIN', 'FIN-KTV01', 'NVKT', 3, false],

    // Phòng Kế toán (KT)
    ['KT', 'KT-TP01', 'TP', 1, true],
    ['KT', 'KT-KTV01', 'NVKT', 4, false],

    // Phòng Kinh doanh (KD)
    ['KD', 'KD-TP01', 'TP', 1, true],
    ['KD', 'KD-PP01', 'PP', 1, false],
    ['KD', 'KD-NV01', 'NVKD', 6, false],

    // Nhóm B2B
    ['KD-B2B', 'KD-B2B-TN01', 'TN', 1, true],
    ['KD-B2B', 'KD-B2B-NV01', 'NVKD', 4, false],

    // Nhóm B2C
    ['KD-B2C', 'KD-B2C-TN01', 'TN', 1, true],
    ['KD-B2C', 'KD-B2C-NV01', 'NVKD', 4, false],

    // Phòng Marketing (MKT)
    ['MKT', 'MKT-TP01', 'TP', 1, true],
    ['MKT', 'MKT-NV01', 'NVMKT', 4, false],

    // Phòng CNTT
    ['CNTT', 'CNTT-TP01', 'TP', 1, true],
    ['CNTT', 'CNTT-PP01', 'PP', 1, false],

    // Nhóm Backend
    ['CNTT-BE', 'BE-TN01', 'TN', 1, true],
    ['CNTT-BE', 'BE-SR01', 'SE-SR', 2, false],
    ['CNTT-BE', 'BE-MID01', 'SE-MID', 4, false],
    ['CNTT-BE', 'BE-JR01', 'SE-JR', 3, false],

    // Nhóm Frontend
    ['CNTT-FE', 'FE-TN01', 'TN', 1, true],
    ['CNTT-FE', 'FE-SR01', 'SE-SR', 2, false],
    ['CNTT-FE', 'FE-MID01', 'SE-MID', 3, false],
    ['CNTT-FE', 'FE-JR01', 'SE-JR', 2, false],

    // Nhóm QA
    ['CNTT-QA', 'QA-TN01', 'TN', 1, true],
    ['CNTT-QA', 'QA-SR01', 'QA-SR', 1, false],
    ['CNTT-QA', 'QA-JR01', 'QA-JR', 2, false],

    // Phòng Kỹ thuật (DEV - đã tồn tại)
    ['DEV', 'DEV-TP01', 'TP', 1, true],
    ['DEV', 'DEV-NV01', 'NVCN', 5, false],

    // Phòng HCVP
    ['HCVP', 'HCVP-TP01', 'TP', 1, true],
    ['HCVP', 'HCVP-NV01', 'NVHC', 3, false],
  ];

  // Kiểm tra đã tồn tại
  const { rows: existingPos } = await client.query('SELECT code FROM positions');
  const existingPosCodes = new Set(existingPos.map(p => p.code));

  let created = 0;
  for (const [unitCode, posCode, jtCode, headcount, isHead] of positions) {
    if (existingPosCodes.has(posCode)) {
      console.log(`  ↳ ${posCode} đã tồn tại, bỏ qua`);
      continue;
    }
    const orgUnitId = unitMap[unitCode];
    const jobTitleId = jtMap[jtCode];
    if (!orgUnitId) { console.warn(`  ! Không tìm thấy org unit: ${unitCode}`); continue; }
    if (!jobTitleId) { console.warn(`  ! Không tìm thấy job title: ${jtCode}`); continue; }

    const id = uid();
    await client.query(
      `INSERT INTO positions (id, code, job_title_id, org_unit_id, headcount, is_head, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)`,
      [id, posCode, jobTitleId, orgUnitId, headcount, isHead, now]
    );
    console.log(`  + ${posCode} (${unitCode}, isHead=${isHead})`);
    created++;
  }

  console.log(`\n✅ Hoàn tất: tạo ${created} vị trí biên chế`);
  await client.end();
}

main().catch(e => { console.error('❌ Lỗi:', e.message); process.exit(1); });
