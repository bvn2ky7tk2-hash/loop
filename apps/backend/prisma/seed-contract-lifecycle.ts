/**
 * Demo data cho E18.1 (Contract Expiry) + E19.1 (Performance Bonus Config)
 * Tạo:
 * - 3 hợp đồng ACTIVE sắp hết hạn (15, 30, 60 ngày tới)
 * - 4 PerformanceBonusConfig mặc định
 *
 * Chạy: npx ts-node -r dotenv/config prisma/seed-contract-lifecycle.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

async function seedDefaultBonusConfigs(tenantId?: string) {
  const existing = await prisma.performanceBonusConfig.count({
    where: { tenantId: tenantId ?? null, isActive: true },
  });

  if (existing > 0) {
    console.log('  PerformanceBonusConfig đã có, bỏ qua.');
    return;
  }

  await prisma.performanceBonusConfig.createMany({
    data: [
      { label: 'EXCELLENT', scoreMin: 9.0, scoreMax: 10.0, coefficient: 2.0, isActive: true, tenantId: tenantId ?? null },
      { label: 'GOOD',      scoreMin: 7.0, scoreMax: 8.9,  coefficient: 1.5, isActive: true, tenantId: tenantId ?? null },
      { label: 'AVERAGE',   scoreMin: 5.0, scoreMax: 6.9,  coefficient: 1.0, isActive: true, tenantId: tenantId ?? null },
      { label: 'BELOW',     scoreMin: 0.0, scoreMax: 4.9,  coefficient: 0.0, isActive: true, tenantId: tenantId ?? null },
    ],
    skipDuplicates: true,
  });
  console.log('  Đã seed 4 PerformanceBonusConfig.');
}

async function main() {
  console.log('=== Seed Contract Lifecycle (E18.1 + E19.1) ===');

  // Lấy nhân viên đầu tiên để gắn demo contract
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take: 3,
    select: { id: true, fullName: true, tenantId: true },
  });

  if (employees.length === 0) {
    console.warn('  Không tìm thấy employee nào. Chạy seed.ts trước.');
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const EXPIRE_IN_DAYS = [15, 30, 60];
    const BASE_SALARY = 15_000_000;

    for (let i = 0; i < Math.min(employees.length, 3); i++) {
      const emp = employees[i];
      const days = EXPIRE_IN_DAYS[i];
      const endDate = addDays(today, days);
      const startDate = addDays(endDate, -365); // HĐ 12 tháng

      const existing = await prisma.contract.findFirst({
        where: {
          employeeId: emp.id,
          status: 'ACTIVE',
          endDate: { gte: today },
          deletedAt: null,
        },
      });

      if (existing) {
        console.log(`  [skip] ${emp.fullName} đã có HĐ ACTIVE.`);
        continue;
      }

      await prisma.contract.create({
        data: {
          employeeId: emp.id,
          type: 'FIXED_12',
          status: 'ACTIVE',
          startDate,
          endDate,
          salaryMonthly: BASE_SALARY,
          currency: 'VND',
          note: `Demo E18.1 — hết hạn sau ${days} ngày`,
          tenantId: emp.tenantId ?? null,
          autoExpireHandled: false,
        },
      });
      console.log(`  Tạo HĐ cho ${emp.fullName} hết hạn sau ${days} ngày (${endDate.toLocaleDateString('vi-VN')})`);
    }
  }

  // Seed PerformanceBonusConfig (không gắn tenant → dùng cho toàn hệ thống)
  console.log('\n--- Seed PerformanceBonusConfig ---');
  await seedDefaultBonusConfigs();

  // Seed thêm cho tenant đầu tiên nếu có
  const firstTenant = await prisma.tenant.findFirst({ select: { id: true, name: true } });
  if (firstTenant) {
    console.log(`  Seed config cho tenant: ${firstTenant.name}`);
    await seedDefaultBonusConfigs(firstTenant.id);
  }

  console.log('\n=== Seed hoàn tất ===');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
