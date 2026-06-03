import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Map cấp độ nhân sự → mã chức danh đại diện
const LEVEL_JOB_CODE: Record<string, string> = {
  JUNIOR: 'JT-001', // Software Engineer
  MID: 'JT-002', // Senior Developer
  SENIOR: 'JT-002',
  EXPERT: 'JT-003', // Product Manager
};
const LEVELS = ['JUNIOR', 'MID', 'SENIOR', 'EXPERT'];

async function main() {
  console.log('🌱 Gán chức danh + vị trí cho nhân sự...\n');

  const jobTitles = await prisma.jobTitle.findMany({ select: { id: true, code: true } });
  const jtByCode = new Map(jobTitles.map((j) => [j.code, j.id]));
  const fallbackJtId = jtByCode.get('JT-001') ?? jobTitles[0]?.id;

  // Các đơn vị đang có nhân sự
  const orgUnits = await prisma.orgUnit.findMany({ select: { id: true, code: true } });
  const orgCode = new Map(orgUnits.map((o) => [o.id, o.code]));

  // Tạo vị trí biên chế cho mỗi đơn vị có nhân sự (1 vị trí / cấp độ) nếu chưa có
  console.log('📋 Tạo vị trí biên chế thiếu cho các đơn vị có nhân sự...');
  let createdPos = 0;
  const orgIdsWithEmp = await prisma.employee.findMany({
    where: { deletedAt: null },
    distinct: ['orgUnitId'],
    select: { orgUnitId: true },
  });
  for (const { orgUnitId } of orgIdsWithEmp) {
    const code = orgCode.get(orgUnitId);
    if (!code) continue;
    for (const lvl of LEVELS) {
      const posCode = `${code}-${lvl}`;
      const exists = await prisma.position.findFirst({ where: { code: posCode } });
      if (exists) continue;
      const jtId = jtByCode.get(LEVEL_JOB_CODE[lvl]) ?? fallbackJtId;
      if (!jtId) continue;
      await prisma.position.create({
        data: {
          code: posCode,
          jobTitleId: jtId,
          orgUnitId,
          headcount: 30,
          isHead: lvl === 'EXPERT',
          isActive: true,
        },
      });
      createdPos++;
    }
  }
  console.log(`   ✓ ${createdPos} vị trí biên chế mới\n`);

  // Nạp lại positions theo (orgUnitId + level từ code) để gán
  const positions = await prisma.position.findMany({
    where: { isActive: true },
    select: { id: true, code: true, orgUnitId: true, jobTitleId: true },
  });
  const posByOrgLevel = new Map<string, { id: string; jobTitleId: string }>();
  const posByOrg = new Map<string, { id: string; jobTitleId: string }[]>();
  for (const p of positions) {
    const arr = posByOrg.get(p.orgUnitId) ?? [];
    arr.push({ id: p.id, jobTitleId: p.jobTitleId });
    posByOrg.set(p.orgUnitId, arr);
    for (const lvl of LEVELS) {
      if (p.code.endsWith(`-${lvl}`)) posByOrgLevel.set(`${p.orgUnitId}:${lvl}`, { id: p.id, jobTitleId: p.jobTitleId });
    }
  }

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: { id: true, orgUnitId: true, level: true },
    orderBy: { code: 'asc' },
  });

  let posCount = 0;
  let jtCount = 0;
  const rrIndex = new Map<string, number>();

  for (const e of employees) {
    let positionId: string | null = null;
    let jobTitleId: string | null = null;

    // Ưu tiên vị trí khớp cấp độ trong đơn vị
    const matched = posByOrgLevel.get(`${e.orgUnitId}:${e.level}`);
    if (matched) {
      positionId = matched.id;
      jobTitleId = matched.jobTitleId;
    } else {
      // Round-robin trong bất kỳ vị trí nào của đơn vị
      const orgPositions = posByOrg.get(e.orgUnitId);
      if (orgPositions && orgPositions.length > 0) {
        const idx = (rrIndex.get(e.orgUnitId) ?? 0) % orgPositions.length;
        rrIndex.set(e.orgUnitId, idx + 1);
        positionId = orgPositions[idx].id;
        jobTitleId = orgPositions[idx].jobTitleId;
      } else {
        jobTitleId = jtByCode.get(LEVEL_JOB_CODE[e.level] ?? 'JT-001') ?? fallbackJtId ?? null;
      }
    }

    if (positionId) posCount++;
    if (jobTitleId) jtCount++;
    await prisma.employee.update({
      where: { id: e.id },
      data: { positionId, jobTitleId },
    });
  }

  console.log(`   ✓ ${employees.length} nhân sự cập nhật`);
  console.log(`   ✓ ${posCount} nhân sự gán vị trí biên chế`);
  console.log(`   ✓ ${jtCount} nhân sự gán chức danh`);
  console.log('\n✅ Hoàn tất gán chức danh + vị trí!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
