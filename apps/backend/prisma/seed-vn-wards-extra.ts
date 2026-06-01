import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mở rộng phường/xã cho thêm tỉnh/thành (bổ sung tiếp qua màn Quản lý danh mục)
const WARDS: Record<string, string[]> = {
  '92': ['Phường Ninh Kiều', 'Phường Cái Khế', 'Phường Tân An', 'Phường An Bình', 'Phường Bình Thủy', 'Phường Cái Răng'], // Cần Thơ
  '46': ['Phường Thuận Hóa', 'Phường Phú Xuân', 'Phường Hương Thủy', 'Phường Thuận An', 'Phường Hương Trà'], // Huế
  '22': ['Phường Hạ Long', 'Phường Bãi Cháy', 'Phường Cẩm Phả', 'Phường Uông Bí', 'Phường Móng Cái'], // Quảng Ninh
  '38': ['Phường Hạc Thành', 'Phường Đông Sơn', 'Phường Sầm Sơn', 'Phường Bỉm Sơn'], // Thanh Hóa
  '40': ['Phường Trường Vinh', 'Phường Thành Vinh', 'Phường Cửa Lò', 'Phường Vinh Phú'], // Nghệ An
};

async function main() {
  console.log('🌱 Mở rộng phường/xã cho thêm tỉnh/thành...\n');
  const provinces = await prisma.category.findMany({ where: { type: 'province' }, select: { id: true, code: true } });
  const byCode = new Map(provinces.map((p) => [p.code, p.id]));
  let total = 0;
  for (const [code, wards] of Object.entries(WARDS)) {
    const parentId = byCode.get(code);
    if (!parentId) continue;
    const r = await prisma.category.createMany({
      data: wards.map((name, i) => ({ type: 'ward', code: `${code}-${String(i + 1).padStart(3, '0')}`, name, parentId, sortOrder: i })),
      skipDuplicates: true,
    });
    total += r.count;
  }
  const all = await prisma.category.count({ where: { type: 'ward' } });
  console.log(`   ✓ +${total} phường/xã. Tổng hiện có: ${all}`);
  console.log('   ⓘ Danh sách đầy đủ ~3321 phường/xã (sau sáp nhập 2025) cần import dataset chính thức qua màn Quản lý danh mục.');
  console.log('\n✅ Hoàn tất!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
