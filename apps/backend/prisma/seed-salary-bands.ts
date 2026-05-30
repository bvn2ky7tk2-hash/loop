/**
 * Seed demo SalaryBand cho Epic 19.2
 * Tạo 3 bậc lương tham chiếu cho 3 vị trí đầu tiên trong DB.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Thang lương 3 cấp: min / mid / max (đơn vị: VNĐ)
const BAND_TEMPLATES = [
  { label: 'Junior',   min: 8_000_000,  mid: 12_000_000, max: 18_000_000 },
  { label: 'Mid',      min: 15_000_000, mid: 22_000_000, max: 32_000_000 },
  { label: 'Senior',   min: 25_000_000, mid: 38_000_000, max: 55_000_000 },
];

async function main() {
  // Lấy tối đa 3 position đầu tiên chưa có band
  const positions = await prisma.position.findMany({
    where: { salaryBands: { none: {} } },
    take: 3,
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true },
  });

  if (positions.length === 0) {
    console.log('Không có position nào thiếu SalaryBand hoặc không có position trong DB.');
    return;
  }

  let created = 0;
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const template = BAND_TEMPLATES[i] ?? BAND_TEMPLATES[BAND_TEMPLATES.length - 1];

    const existing = await prisma.salaryBand.findFirst({ where: { positionId: pos.id } });
    if (!existing) {
      await prisma.salaryBand.create({
        data: {
          positionId:    pos.id,
          minSalary:     template.min,
          midSalary:     template.mid,
          maxSalary:     template.max,
          currency:      'VND',
          effectiveFrom: new Date(),
        },
      });
    }
    console.log(`  SalaryBand ${template.label}: ${pos.code} → min=${template.min.toLocaleString('vi-VN')}đ, mid=${template.mid.toLocaleString('vi-VN')}đ, max=${template.max.toLocaleString('vi-VN')}đ`);
    created++;
  }

  console.log(`\nDone: ${created} SalaryBand records.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
