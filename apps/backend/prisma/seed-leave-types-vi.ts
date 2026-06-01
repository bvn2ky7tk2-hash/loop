import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Tên tiếng Anh có bản tiếng Việt tương đương → vô hiệu hóa bản tiếng Anh
const DEACTIVATE = ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Unpaid Leave'];
// Đổi tên các loại còn lại sang tiếng Việt
const RENAME: Record<string, string> = { 'Paternity Leave': 'Nghỉ vợ sinh con' };
// Loại có TRỪ vào phép năm
const DEDUCTS = ['Nghỉ phép năm'];

async function main() {
  console.log('🌱 Việt hóa loại nghỉ + cấu hình trừ phép năm...\n');
  const types = await prisma.leaveType.findMany();
  let changed = 0;

  for (const t of types) {
    const data: { name?: string; isActive?: boolean; deductsAnnualLeave?: boolean } = {};
    if (DEACTIVATE.includes(t.name)) data.isActive = false;
    if (RENAME[t.name]) data.name = RENAME[t.name];
    const finalName = data.name ?? t.name;
    data.deductsAnnualLeave = DEDUCTS.some((d) => finalName.includes(d));
    await prisma.leaveType.update({ where: { id: t.id }, data });
    changed++;
  }

  const active = await prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  console.log(`   ✓ Cập nhật ${changed} loại. Đang hoạt động (${active.length}):`);
  active.forEach((t) => console.log(`     - ${t.name}${t.deductsAnnualLeave ? '  [trừ phép năm]' : ''}${t.isPaid ? '' : '  (không lương)'}`));
  console.log('\n✅ Hoàn tất Việt hóa loại nghỉ!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
