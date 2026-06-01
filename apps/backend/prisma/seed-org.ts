import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DB_URL =
  process.env['DATABASE_URL'] ||
  'postgresql://loop:loop_password@localhost:5432/loop_db';

interface OrgUnitInput {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  tenantId: string;
}

async function upsertOrgUnit(client: InstanceType<typeof Client>, unit: OrgUnitInput): Promise<void> {
  const existing = await client.query(
    'SELECT id FROM org_units WHERE tenant_id = $1 AND code = $2',
    [unit.tenantId, unit.code],
  );
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE org_units SET name = $1, parent_id = $2, level = $3, updated_at = NOW()
       WHERE tenant_id = $4 AND code = $5`,
      [unit.name, unit.parentId, unit.level, unit.tenantId, unit.code],
    );
    // Trả về ID thực từ DB (không phải ID placeholder)
    return;
  }
  await client.query(
    `INSERT INTO org_units (id, name, code, parent_id, level, tenant_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [unit.id, unit.name, unit.code, unit.parentId, unit.level, unit.tenantId],
  );
}

async function getOrCreateTenant(client: InstanceType<typeof Client>): Promise<string> {
  const res = await client.query('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1');
  if (res.rows.length > 0) {
    console.log(`  ✓ Dùng tenant hiện có: ${res.rows[0].id}`);
    return res.rows[0].id as string;
  }
  // Tạo tenant mới nếu chưa có
  const newId = randomUUID();
  await client.query(
    `INSERT INTO tenants (id, name, slug, plan, is_active, created_at, updated_at)
     VALUES ($1, 'Loop Holdings', 'loop-holdings', 'ENTERPRISE', true, NOW(), NOW())`,
    [newId],
  );
  console.log(`  ✓ Đã tạo tenant mới: ${newId}`);
  return newId;
}

async function getActualId(
  client: InstanceType<typeof Client>,
  tenantId: string,
  code: string,
): Promise<string> {
  const res = await client.query(
    'SELECT id FROM org_units WHERE tenant_id = $1 AND code = $2',
    [tenantId, code],
  );
  if (res.rows.length === 0) throw new Error(`OrgUnit không tìm thấy: code=${code}`);
  return res.rows[0].id as string;
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('🔄 Seeding OrgUnit structure — Loop Holdings (5 cấp)...\n');

  // ── Bước 1: Lấy hoặc tạo tenant ──────────────────────────────────────────
  const tenantId = await getOrCreateTenant(client);

  // ── Bước 2: Định nghĩa toàn bộ cấu trúc ────────────────────────────────
  // Dùng ID tạm để insert; sau đó đọc lại ID thực từ DB để build parent

  // Level 1 — Tập đoàn
  const L1: OrgUnitInput[] = [
    { id: randomUUID(), name: 'Loop Holdings', code: 'LH', parentId: null, level: 1, tenantId },
  ];

  // Level 2 — 4 công ty thành viên (parentId sẽ được điền sau khi insert L1)
  const L2_DEFS = [
    { name: 'Loop Technology', code: 'LT' },
    { name: 'Loop Services',   code: 'LS' },
    { name: 'Loop Finance',    code: 'LF' },
    { name: 'Loop Operations', code: 'LO' },
  ];

  // Level 3 — Khối mỗi công ty
  const L3_DEFS: Record<string, Array<{ name: string; code: string }>> = {
    LT: [
      { name: 'Khối Kỹ thuật',  code: 'LT-KT' },
      { name: 'Khối Kinh doanh', code: 'LT-KD' },
      { name: 'Khối Vận hành',  code: 'LT-VH' },
      { name: 'Khối Hỗ trợ',    code: 'LT-HT' },
    ],
    LS: [
      { name: 'Khối Triển khai', code: 'LS-TK' },
      { name: 'Khối Kinh doanh', code: 'LS-KD' },
      { name: 'Khối Vận hành',   code: 'LS-VH' },
    ],
    LF: [
      { name: 'Khối Tài chính',   code: 'LF-TC' },
      { name: 'Khối Kiểm soát',   code: 'LF-KS' },
      { name: 'Khối Hỗ trợ',      code: 'LF-HT' },
    ],
    LO: [
      { name: 'Khối Hạ tầng',    code: 'LO-HC' },
      { name: 'Khối Vận hành',   code: 'LO-VH' },
      { name: 'Khối An toàn',    code: 'LO-AT' },
    ],
  };

  // Level 4 — Phòng ban mỗi khối
  const L4_DEFS: Record<string, Array<{ name: string; code: string }>> = {
    // Loop Technology — Kỹ thuật
    'LT-KT': [
      { name: 'Phòng Phát triển Backend', code: 'LT-KT-BE' },
      { name: 'Phòng Phát triển Frontend', code: 'LT-KT-FE' },
      { name: 'Phòng QA & Testing',        code: 'LT-KT-QA' },
    ],
    // Loop Technology — Kinh doanh
    'LT-KD': [
      { name: 'Phòng Sales',     code: 'LT-KD-SA' },
      { name: 'Phòng Marketing', code: 'LT-KD-MK' },
    ],
    // Loop Technology — Vận hành
    'LT-VH': [
      { name: 'Phòng DevOps & Cloud', code: 'LT-VH-DO' },
      { name: 'Phòng Bảo mật',        code: 'LT-VH-BM' },
    ],
    // Loop Technology — Hỗ trợ
    'LT-HT': [
      { name: 'Phòng HR',      code: 'LT-HT-HR' },
      { name: 'Phòng Kế toán', code: 'LT-HT-KT' },
    ],
    // Loop Services — Triển khai
    'LS-TK': [
      { name: 'Phòng Triển khai Dự án',   code: 'LS-TK-DA' },
      { name: 'Phòng Tư vấn Giải pháp',   code: 'LS-TK-TV' },
      { name: 'Phòng Hỗ trợ Kỹ thuật',    code: 'LS-TK-HT' },
    ],
    // Loop Services — Kinh doanh
    'LS-KD': [
      { name: 'Phòng Phát triển Thị trường', code: 'LS-KD-TT' },
      { name: 'Phòng Quản lý Khách hàng',    code: 'LS-KD-KH' },
    ],
    // Loop Services — Vận hành
    'LS-VH': [
      { name: 'Phòng Quản lý Chất lượng', code: 'LS-VH-CL' },
      { name: 'Phòng Hành chính',          code: 'LS-VH-HC' },
    ],
    // Loop Finance — Tài chính
    'LF-TC': [
      { name: 'Phòng Kế hoạch Tài chính', code: 'LF-TC-KH' },
      { name: 'Phòng Kế toán Tổng hợp',   code: 'LF-TC-KT' },
      { name: 'Phòng Thanh toán',          code: 'LF-TC-TT' },
    ],
    // Loop Finance — Kiểm soát
    'LF-KS': [
      { name: 'Phòng Kiểm toán Nội bộ', code: 'LF-KS-KT' },
      { name: 'Phòng Quản lý Rủi ro',   code: 'LF-KS-RR' },
    ],
    // Loop Finance — Hỗ trợ
    'LF-HT': [
      { name: 'Phòng Hành chính Tài chính', code: 'LF-HT-HC' },
    ],
    // Loop Operations — Hạ tầng
    'LO-HC': [
      { name: 'Phòng Hạ tầng Mạng',   code: 'LO-HC-MG' },
      { name: 'Phòng Trung tâm Dữ liệu', code: 'LO-HC-DC' },
    ],
    // Loop Operations — Vận hành
    'LO-VH': [
      { name: 'Phòng Giám sát Hệ thống', code: 'LO-VH-GS' },
      { name: 'Phòng Bảo trì',            code: 'LO-VH-BT' },
      { name: 'Phòng Hậu cần',            code: 'LO-VH-HC' },
    ],
    // Loop Operations — An toàn
    'LO-AT': [
      { name: 'Phòng An toàn Lao động', code: 'LO-AT-LD' },
      { name: 'Phòng Môi trường',        code: 'LO-AT-MT' },
    ],
  };

  // Level 5 — Team/Tổ mỗi phòng (chọn phòng lớn/quan trọng)
  const L5_DEFS: Record<string, Array<{ name: string; code: string }>> = {
    // Backend → Team Backend Core & Team API Integration
    'LT-KT-BE': [
      { name: 'Tổ Backend Core',        code: 'LT-KT-BE-T1' },
      { name: 'Tổ API & Integration',   code: 'LT-KT-BE-T2' },
    ],
    // Frontend → Team Web & Team Mobile
    'LT-KT-FE': [
      { name: 'Tổ Web Frontend',   code: 'LT-KT-FE-T1' },
      { name: 'Tổ Mobile App',     code: 'LT-KT-FE-T2' },
    ],
    // QA → Team Automation & Team Manual
    'LT-KT-QA': [
      { name: 'Tổ Automation Test', code: 'LT-KT-QA-T1' },
      { name: 'Tổ Manual & UAT',    code: 'LT-KT-QA-T2' },
    ],
    // DevOps → Team Cloud Infra & Team CI/CD
    'LT-VH-DO': [
      { name: 'Tổ Cloud Infrastructure', code: 'LT-VH-DO-T1' },
      { name: 'Tổ CI/CD & Automation',   code: 'LT-VH-DO-T2' },
    ],
    // Triển khai Dự án → Team Onsite & Team Remote
    'LS-TK-DA': [
      { name: 'Tổ Triển khai Onsite',  code: 'LS-TK-DA-T1' },
      { name: 'Tổ Triển khai Remote',  code: 'LS-TK-DA-T2' },
    ],
    // Hỗ trợ KT → Team Level1 & Team Level2
    'LS-TK-HT': [
      { name: 'Tổ Support L1',   code: 'LS-TK-HT-T1' },
      { name: 'Tổ Support L2/L3', code: 'LS-TK-HT-T2' },
    ],
    // Kế toán Tổng hợp → Team Thuế & Team Sổ sách
    'LF-TC-KT': [
      { name: 'Tổ Thuế & Báo cáo',  code: 'LF-TC-KT-T1' },
      { name: 'Tổ Sổ sách Kế toán', code: 'LF-TC-KT-T2' },
    ],
    // Giám sát Hệ thống → Team NOC & Team Alert
    'LO-VH-GS': [
      { name: 'Tổ NOC (Network Ops)',  code: 'LO-VH-GS-T1' },
      { name: 'Tổ Alert & Incident',   code: 'LO-VH-GS-T2' },
    ],
  };

  // ── Bước 3: Insert theo thứ tự cấp ──────────────────────────────────────

  // Level 1
  console.log('📌 Level 1 — Tập đoàn:');
  for (const u of L1) {
    await upsertOrgUnit(client, u);
    console.log(`  ✓ [L1] ${u.name} (${u.code})`);
  }

  // Lấy lại ID thực của L1
  const lhId = await getActualId(client, tenantId, 'LH');

  // Level 2
  console.log('\n📌 Level 2 — Công ty thành viên:');
  const l2Map: Record<string, string> = {}; // code → actualId (sau insert)
  for (const def of L2_DEFS) {
    const u: OrgUnitInput = {
      id: randomUUID(),
      name: def.name,
      code: def.code,
      parentId: lhId,
      level: 2,
      tenantId,
    };
    await upsertOrgUnit(client, u);
    l2Map[def.code] = await getActualId(client, tenantId, def.code);
    console.log(`  ✓ [L2] ${def.name} (${def.code})`);
  }

  // Level 3
  console.log('\n📌 Level 3 — Khối:');
  const l3Map: Record<string, string> = {};
  for (const [parentCode, blocks] of Object.entries(L3_DEFS)) {
    const parentId = l2Map[parentCode];
    for (const def of blocks) {
      const u: OrgUnitInput = {
        id: randomUUID(),
        name: def.name,
        code: def.code,
        parentId,
        level: 3,
        tenantId,
      };
      await upsertOrgUnit(client, u);
      l3Map[def.code] = await getActualId(client, tenantId, def.code);
      console.log(`  ✓ [L3] ${def.name} (${def.code}) ← ${parentCode}`);
    }
  }

  // Level 4
  console.log('\n📌 Level 4 — Phòng ban:');
  const l4Map: Record<string, string> = {};
  for (const [parentCode, depts] of Object.entries(L4_DEFS)) {
    const parentId = l3Map[parentCode];
    for (const def of depts) {
      const u: OrgUnitInput = {
        id: randomUUID(),
        name: def.name,
        code: def.code,
        parentId,
        level: 4,
        tenantId,
      };
      await upsertOrgUnit(client, u);
      l4Map[def.code] = await getActualId(client, tenantId, def.code);
      console.log(`  ✓ [L4] ${def.name} (${def.code}) ← ${parentCode}`);
    }
  }

  // Level 5
  console.log('\n📌 Level 5 — Team/Tổ:');
  const l5Map: Record<string, string> = {};
  for (const [parentCode, teams] of Object.entries(L5_DEFS)) {
    const parentId = l4Map[parentCode];
    for (const def of teams) {
      const u: OrgUnitInput = {
        id: randomUUID(),
        name: def.name,
        code: def.code,
        parentId,
        level: 5,
        tenantId,
      };
      await upsertOrgUnit(client, u);
      l5Map[def.code] = await getActualId(client, tenantId, def.code);
      console.log(`  ✓ [L5] ${def.name} (${def.code}) ← ${parentCode}`);
    }
  }

  // ── Bước 4: Report IDs các OrgUnit chính ────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 REPORT: IDs các OrgUnit chính (để seed users)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const allCodes = [
    'LH',
    ...L2_DEFS.map((d) => d.code),
    ...Object.values(L3_DEFS).flat().map((d) => d.code),
    ...Object.values(L4_DEFS).flat().map((d) => d.code),
    ...Object.values(L5_DEFS).flat().map((d) => d.code),
  ];

  const idReport: Record<string, string> = {};
  for (const code of allCodes) {
    const res = await client.query(
      'SELECT id, name FROM org_units WHERE tenant_id = $1 AND code = $2',
      [tenantId, code],
    );
    if (res.rows.length > 0) {
      idReport[code] = res.rows[0].id as string;
      console.log(`  ${code.padEnd(20)} │ ${res.rows[0].id}  │ ${res.rows[0].name}`);
    }
  }

  const totalRes = await client.query(
    'SELECT COUNT(*) FROM org_units WHERE tenant_id = $1',
    [tenantId],
  );
  console.log(`\n✅ Tổng OrgUnit trong tenant: ${totalRes.rows[0].count}`);
  console.log(`   tenantId: ${tenantId}`);
  console.log(`   holdingsId (LH): ${idReport['LH']}`);
  console.log(`   Loop Technology (LT): ${idReport['LT']}`);
  console.log(`   Loop Services (LS): ${idReport['LS']}`);
  console.log(`   Loop Finance (LF): ${idReport['LF']}`);
  console.log(`   Loop Operations (LO): ${idReport['LO']}`);

  await client.end();
}

main().catch((err) => {
  console.error('❌ Lỗi seed-org:', err);
  process.exit(1);
});
