import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 34 đơn vị hành chính cấp tỉnh sau sáp nhập 2025 (6 TP trực thuộc TW + 28 tỉnh)
const PROVINCES: [string, string][] = [
  ['01', 'Thành phố Hà Nội'], ['31', 'Thành phố Hải Phòng'], ['48', 'Thành phố Đà Nẵng'],
  ['46', 'Thành phố Huế'], ['79', 'Thành phố Hồ Chí Minh'], ['92', 'Thành phố Cần Thơ'],
  ['12', 'Tỉnh Lai Châu'], ['11', 'Tỉnh Điện Biên'], ['14', 'Tỉnh Sơn La'],
  ['20', 'Tỉnh Lạng Sơn'], ['04', 'Tỉnh Cao Bằng'], ['08', 'Tỉnh Tuyên Quang'],
  ['10', 'Tỉnh Lào Cai'], ['19', 'Tỉnh Thái Nguyên'], ['25', 'Tỉnh Phú Thọ'],
  ['24', 'Tỉnh Bắc Ninh'], ['33', 'Tỉnh Hưng Yên'], ['37', 'Tỉnh Ninh Bình'],
  ['22', 'Tỉnh Quảng Ninh'], ['38', 'Tỉnh Thanh Hóa'], ['40', 'Tỉnh Nghệ An'],
  ['42', 'Tỉnh Hà Tĩnh'], ['44', 'Tỉnh Quảng Trị'], ['51', 'Tỉnh Quảng Ngãi'],
  ['52', 'Tỉnh Gia Lai'], ['56', 'Tỉnh Khánh Hòa'], ['66', 'Tỉnh Đắk Lắk'],
  ['68', 'Tỉnh Lâm Đồng'], ['75', 'Tỉnh Đồng Nai'], ['72', 'Tỉnh Tây Ninh'],
  ['82', 'Tỉnh Đồng Tháp'], ['86', 'Tỉnh Vĩnh Long'], ['89', 'Tỉnh An Giang'],
  ['96', 'Tỉnh Cà Mau'],
];

// Phường/xã mẫu cho một số TP lớn (bổ sung thêm qua màn Quản lý danh mục)
const WARDS: Record<string, string[]> = {
  '01': ['Phường Ba Đình', 'Phường Hoàn Kiếm', 'Phường Đống Đa', 'Phường Hai Bà Trưng', 'Phường Cầu Giấy', 'Phường Tây Hồ', 'Phường Thanh Xuân', 'Phường Hà Đông'],
  '79': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Sài Gòn', 'Phường Tân Định', 'Phường Bình Thạnh', 'Phường Gia Định', 'Phường Phú Nhuận', 'Phường Thủ Đức'],
  '48': ['Phường Hải Châu', 'Phường Thanh Khê', 'Phường Sơn Trà', 'Phường Ngũ Hành Sơn', 'Phường Liên Chiểu', 'Phường Hòa Cường'],
  '31': ['Phường Hồng Bàng', 'Phường Ngô Quyền', 'Phường Lê Chân', 'Phường Hải An', 'Phường Kiến An', 'Phường Đồ Sơn'],
};

async function main() {
  console.log('🌱 Seed danh mục Tỉnh/Thành + Phường/Xã VN...\n');

  if (await prisma.category.count({ where: { type: 'province' } }) > 0) {
    console.log('⏭  Đã có danh mục tỉnh, bỏ qua (chỉnh sửa qua màn Quản lý danh mục).');
    return;
  }

  // Tỉnh/Thành
  await prisma.category.createMany({
    data: PROVINCES.map(([code, name], i) => ({ type: 'province', code, name, sortOrder: i })),
    skipDuplicates: true,
  });
  console.log(`   ✓ ${PROVINCES.length} tỉnh/thành phố`);

  // Phường/Xã (parent = tỉnh)
  const provinces = await prisma.category.findMany({ where: { type: 'province' }, select: { id: true, code: true } });
  const byCode = new Map(provinces.map((p) => [p.code, p.id]));
  let wardCount = 0;
  for (const [provCode, wards] of Object.entries(WARDS)) {
    const parentId = byCode.get(provCode);
    if (!parentId) continue;
    await prisma.category.createMany({
      data: wards.map((name, i) => ({ type: 'ward', code: `${provCode}-${String(i + 1).padStart(3, '0')}`, name, parentId, sortOrder: i })),
      skipDuplicates: true,
    });
    wardCount += wards.length;
  }
  console.log(`   ✓ ${wardCount} phường/xã mẫu (4 TP lớn)`);
  console.log('\n✅ Hoàn tất! Bổ sung/điều chỉnh đầy đủ qua màn "Quản lý danh mục".');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
