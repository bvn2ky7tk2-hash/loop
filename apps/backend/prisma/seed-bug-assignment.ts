import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Gán người phụ trách cho bug...\n');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@loop.vn' }, select: { id: true } });
  const pool2 = await prisma.user.findMany({ where: { isActive: true }, select: { id: true }, take: 25 });
  if (pool2.length === 0) { console.log('❌ Cần users.'); return; }

  // Chỉ gán cho bug chưa có assignee (idempotent)
  const bugs = await prisma.bug.findMany({ where: { assigneeId: null }, select: { id: true }, orderBy: { createdAt: 'asc' } });
  if (bugs.length === 0) { console.log('⏭  Mọi bug đã có người phụ trách.'); return; }

  let toAdmin = 0;
  for (let i = 0; i < bugs.length; i++) {
    // 12 bug đầu giao cho admin để trang "My Bugs" có dữ liệu, còn lại round-robin
    const assigneeId = admin && i < 12 ? admin.id : pool2[i % pool2.length].id;
    if (admin && assigneeId === admin.id) toAdmin++;
    await prisma.bug.update({ where: { id: bugs[i].id }, data: { assigneeId } });
  }

  console.log(`   ✓ ${bugs.length} bug được gán người phụ trách`);
  if (admin) console.log(`   ✓ ${toAdmin} bug giao cho admin@loop.vn`);
  console.log('\n✅ Hoàn tất gán bug!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
