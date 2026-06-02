import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Dataset chính thức 34 tỉnh + 3321 phường/xã (nghị định 19/2025/QĐ-TTg, sau sáp nhập 2025)
// Nguồn: github.com/thanglequoc/vietnamese-provinces-database
interface WardJson { Code: string; FullName: string; ProvinceCode: string }
interface ProvinceJson { Code: string; FullName: string; Wards: WardJson[] }

async function main() {
  console.log('🌱 Import đầy đủ Tỉnh/Phường-Xã (dataset chính thức 2025)...\n');

  const raw = readFileSync(join(__dirname, 'data', 'vn-units-2025.json'), 'utf-8');
  const provinces: ProvinceJson[] = JSON.parse(raw);

  // 1) Upsert 34 tỉnh theo (type, code)
  console.log(`🏙️  Upsert ${provinces.length} tỉnh/thành...`);
  const provinceIdByCode = new Map<string, string>();
  for (let i = 0; i < provinces.length; i++) {
    const p = provinces[i]!;
    const cat = await prisma.category.upsert({
      where: { type_code: { type: 'province', code: p.Code } },
      create: { type: 'province', code: p.Code, name: p.FullName, sortOrder: i, isActive: true },
      update: { name: p.FullName },
      select: { id: true },
    });
    provinceIdByCode.set(p.Code, cat.id);
  }

  // 2a) Xóa tỉnh cũ không thuộc 34 đơn vị chính thức (seed mẫu trước sáp nhập dùng code khác)
  const validCodes = provinces.map((p) => p.Code);
  const delProv = await prisma.category.deleteMany({
    where: { type: 'province', code: { notIn: validCodes } },
  });
  if (delProv.count) console.log(`🧹  Xóa ${delProv.count} tỉnh cũ (trước sáp nhập 2025).`);

  // 2b) Xóa toàn bộ ward cũ (seed mẫu trước đó dùng code khác) để tránh trùng tên
  const del = await prisma.category.deleteMany({ where: { type: 'ward' } });
  console.log(`🧹  Xóa ${del.count} phường/xã cũ (seed mẫu).`);

  // 3) Bulk insert 3321 phường/xã với parentId map từ ProvinceCode
  console.log('🏘️  Insert phường/xã đầy đủ...');
  const rows = provinces.flatMap((p) =>
    p.Wards.map((w, i) => ({
      type: 'ward',
      code: w.Code,
      name: w.FullName,
      parentId: provinceIdByCode.get(w.ProvinceCode)!,
      sortOrder: i,
      isActive: true,
    })),
  );

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const r = await prisma.category.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true });
    inserted += r.count;
  }

  const totalWard = await prisma.category.count({ where: { type: 'ward' } });
  const totalProv = await prisma.category.count({ where: { type: 'province' } });
  console.log(`\n✅ Hoàn tất! Tỉnh: ${totalProv} · Phường/Xã: ${totalWard} (insert ${inserted}).`);
}

main()
  .catch((e) => { console.error('❌ Lỗi:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
