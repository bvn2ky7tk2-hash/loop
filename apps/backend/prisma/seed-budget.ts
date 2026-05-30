/**
 * Seed dữ liệu demo cho Budget Management (Epic E17).
 *
 * Chạy: npx tsx prisma/seed-budget.ts
 *       hoặc: npm run seed:budget
 *
 * Yêu cầu: DATABASE_URL trong .env trỏ tới PostgreSQL đã chạy migrate.
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Budget data...');

  // Lấy OrgUnit đầu tiên (phòng CNTT) để gán ngân sách
  const itUnit = await (prisma as any).orgUnit.findFirst({
    where: { name: { contains: 'CNTT', mode: 'insensitive' } },
    select: { id: true, name: true },
  }) ?? await (prisma as any).orgUnit.findFirst({
    select: { id: true, name: true },
  });

  // Lấy OrgUnit thứ hai (phòng Marketing) nếu có
  const marketingUnit = await (prisma as any).orgUnit.findFirst({
    where: {
      name: { contains: 'Marketing', mode: 'insensitive' },
      id: { not: itUnit?.id },
    },
    select: { id: true, name: true },
  }) ?? await (prisma as any).orgUnit.findFirst({
    where: { id: { not: itUnit?.id } },
    select: { id: true, name: true },
  });

  // ── Kế hoạch ACTIVE: Ngân sách CNTT 2026 ──────────────────────────────────
  const existingItPlan = await (prisma as any).budgetPlan.findFirst({
    where: { name: 'Ngân sách CNTT 2026' },
  });

  if (!existingItPlan) {
    const itPlan = await (prisma as any).budgetPlan.create({
      data: {
        name: 'Ngân sách CNTT 2026',
        fiscalYear: 2026,
        type: 'DEPARTMENT',
        status: 'ACTIVE',
        orgUnitId: itUnit?.id ?? null,
        totalAmount: 400000000, // 400 triệu VND
        note: 'Ngân sách hoạt động phòng CNTT năm 2026 — đã được phê duyệt',
        approvedAt: new Date('2026-01-10'),
        lines: {
          create: [
            {
              category: 'Nhân sự',
              description: 'Lương, phụ cấp, thưởng nhân viên CNTT',
              allocatedAmount: 200000000,
              usedAmount: 160000000,   // 80% đã dùng
              committedAmount: 10000000,
              alertThreshold: 80,
            },
            {
              category: 'Công cụ IT',
              description: 'Bản quyền phần mềm, thiết bị, dịch vụ cloud',
              allocatedAmount: 100000000,
              usedAmount: 45000000,    // 45% đã dùng
              committedAmount: 5000000,
              alertThreshold: 85,
            },
            {
              category: 'Đào tạo',
              description: 'Chi phí đào tạo, hội thảo, chứng chỉ kỹ thuật',
              allocatedAmount: 100000000,
              usedAmount: 10000000,    // 10% đã dùng
              committedAmount: 0,
              alertThreshold: 90,
            },
          ],
        },
      },
      include: { lines: true },
    });

    console.log(`✅ Tạo BudgetPlan ACTIVE: "${itPlan.name}" — ${itPlan.lines.length} dòng ngân sách`);

    // Ghi một số BudgetTransaction demo cho dòng Nhân sự
    const personnelLine = itPlan.lines.find((l: any) => l.category === 'Nhân sự');
    if (personnelLine) {
      await (prisma as any).budgetTransaction.createMany({
        data: [
          {
            lineId: personnelLine.id,
            sourceType: 'EXPENSE',
            sourceId: 'demo-expense-001',
            amount: 50000000,
            type: 'ACTUAL',
          },
          {
            lineId: personnelLine.id,
            sourceType: 'EXPENSE',
            sourceId: 'demo-expense-002',
            amount: 110000000,
            type: 'ACTUAL',
          },
        ],
      });
      console.log('  ✅ Ghi 2 BudgetTransaction cho dòng Nhân sự');
    }
  } else {
    console.log(`⏭️  BudgetPlan "${existingItPlan.name}" đã tồn tại, bỏ qua`);
  }

  // ── Kế hoạch DRAFT: Ngân sách Marketing 2026 ──────────────────────────────
  const existingMktPlan = await (prisma as any).budgetPlan.findFirst({
    where: { name: 'Ngân sách Marketing 2026' },
  });

  if (!existingMktPlan) {
    const mktPlan = await (prisma as any).budgetPlan.create({
      data: {
        name: 'Ngân sách Marketing 2026',
        fiscalYear: 2026,
        type: 'DEPARTMENT',
        status: 'DRAFT',
        orgUnitId: marketingUnit?.id ?? null,
        totalAmount: 200000000, // 200 triệu VND
        note: 'Dự thảo ngân sách Marketing Q1-Q4 2026 — chờ phê duyệt',
        lines: {
          create: [
            {
              category: 'Quảng cáo Digital',
              description: 'Facebook Ads, Google Ads, TikTok Ads',
              allocatedAmount: 120000000,
              usedAmount: 0,
              committedAmount: 0,
              alertThreshold: 80,
            },
            {
              category: 'Sự kiện & PR',
              description: 'Hội thảo, triển lãm, quan hệ báo chí',
              allocatedAmount: 80000000,
              usedAmount: 0,
              committedAmount: 0,
              alertThreshold: 85,
            },
          ],
        },
      },
      include: { lines: true },
    });

    console.log(`✅ Tạo BudgetPlan DRAFT: "${mktPlan.name}" — ${mktPlan.lines.length} dòng ngân sách`);
  } else {
    console.log(`⏭️  BudgetPlan "${existingMktPlan.name}" đã tồn tại, bỏ qua`);
  }

  console.log('✅ Budget seed hoàn tất!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed budget:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
