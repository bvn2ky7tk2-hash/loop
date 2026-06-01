import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 54 dân tộc Việt Nam
const ETHNICITIES = [
  'Kinh', 'Tày', 'Thái', 'Mường', 'Khmer', 'Hoa', 'Nùng', 'HMông', 'Dao', 'Gia Rai',
  'Ê Đê', 'Ba Na', 'Xơ Đăng', 'Sán Chay', 'Cơ Ho', 'Chăm', 'Sán Dìu', 'Hrê', 'Ra Glai', 'Mnông',
  'Thổ', 'Stiêng', 'Khơ Mú', 'Bru Vân Kiều', 'Cơ Tu', 'Giáy', 'Tà Ôi', 'Mạ', 'Giẻ Triêng', 'Co',
  'Chơ Ro', 'Xinh Mun', 'Hà Nhì', 'Chu Ru', 'Lào', 'La Chí', 'Kháng', 'Phù Lá', 'La Hủ', 'La Ha',
  'Pà Thẻn', 'Lự', 'Ngái', 'Chứt', 'Lô Lô', 'Mảng', 'Cơ Lao', 'Bố Y', 'Cống', 'Si La',
  'Pu Péo', 'Rơ Măm', 'Brâu', 'Ơ Đu',
];
const RELIGIONS = ['Không', 'Phật giáo', 'Công giáo', 'Tin Lành', 'Cao Đài', 'Hòa Hảo', 'Hồi giáo', 'Khác'];
const DEGREES = ['Trung học phổ thông', 'Trung cấp', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ'];
const CONTRACTS = ['Thử việc', 'Có thời hạn', 'Không thời hạn', 'Thời vụ', 'Cộng tác viên'];

async function seedType(type: string, names: string[], prefix: string) {
  const data = names.map((name, i) => ({ type, code: `${prefix}${String(i + 1).padStart(2, '0')}`, name, sortOrder: i }));
  const r = await prisma.category.createMany({ data, skipDuplicates: true });
  console.log(`   ✓ ${type}: +${r.count}/${names.length}`);
}

async function main() {
  console.log('🌱 Seed danh mục HR (dân tộc, tôn giáo, học vấn, loại HĐ)...\n');
  await seedType('ethnicity', ETHNICITIES, 'DT');
  await seedType('religion', RELIGIONS, 'TG');
  await seedType('education_level', DEGREES, 'HV');
  await seedType('contract_type', CONTRACTS, 'HD');
  console.log('\n✅ Hoàn tất seed danh mục HR!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
