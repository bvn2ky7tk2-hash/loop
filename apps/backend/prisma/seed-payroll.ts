import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function upsertInsuranceConfig(data: Parameters<typeof prisma.insuranceConfig.create>[0]['data']) {
  const exists = await prisma.insuranceConfig.findFirst({
    where: { tenantId: null, effectiveFrom: data.effectiveFrom as Date },
  });
  if (!exists) await prisma.insuranceConfig.create({ data });
}

async function upsertTaxBracket(data: Parameters<typeof prisma.taxBracket.create>[0]['data']) {
  const exists = await prisma.taxBracket.findFirst({
    where: { tenantId: null, effectiveFrom: data.effectiveFrom as Date },
  });
  if (!exists) await prisma.taxBracket.create({ data });
}

async function upsertTaxDeduction(data: Parameters<typeof prisma.taxDeductionConfig.create>[0]['data']) {
  const exists = await prisma.taxDeductionConfig.findFirst({
    where: { tenantId: null, effectiveFrom: data.effectiveFrom as Date },
  });
  if (!exists) await prisma.taxDeductionConfig.create({ data });
}

async function upsertWageZone(data: Parameters<typeof prisma.wageZoneConfig.create>[0]['data']) {
  const exists = await prisma.wageZoneConfig.findFirst({
    where: { tenantId: null, effectiveFrom: data.effectiveFrom as Date },
  });
  if (!exists) await prisma.wageZoneConfig.create({ data });
}

async function main() {
  console.log('🌱 Seeding Epic 22 — Payroll Compliance data...');

  // 1. InsuranceConfig
  await upsertInsuranceConfig({
    tenantId: null,
    effectiveFrom: new Date('2020-01-01'),
    bhxhEmployeeRate: 0.08,
    bhytEmployeeRate: 0.015,
    bhtnEmployeeRate: 0.01,
    bhxhEmployerRate: 0.17,
    bhytEmployerRate: 0.03,
    bhtnEmployerRate: 0.01,
    tnldRate: 0.005,
    bhxhCeilingMultiple: 20,
    wageBase: 2340000,
  });

  // lương cơ sở mới từ 01/07/2026
  await upsertInsuranceConfig({
    tenantId: null,
    effectiveFrom: new Date('2026-07-01'),
    bhxhEmployeeRate: 0.08,
    bhytEmployeeRate: 0.015,
    bhtnEmployeeRate: 0.01,
    bhxhEmployerRate: 0.17,
    bhytEmployerRate: 0.03,
    bhtnEmployerRate: 0.01,
    tnldRate: 0.005,
    bhxhCeilingMultiple: 20,
    wageBase: 2530000,
  });
  console.log('  ✓ InsuranceConfig (2020-01-01 + 2026-07-01) seeded');

  // 2. TaxBracket — biểu 7 bậc (đến 31/12/2025)
  await upsertTaxBracket({
    tenantId: null,
    name: 'Biểu thuế 7 bậc (đến 31/12/2025)',
    effectiveFrom: new Date('2020-01-01'),
    brackets: [
      { from: 0,        to: 5000000,   rate: 0.05 },
      { from: 5000000,  to: 10000000,  rate: 0.10 },
      { from: 10000000, to: 18000000,  rate: 0.15 },
      { from: 18000000, to: 32000000,  rate: 0.20 },
      { from: 32000000, to: 52000000,  rate: 0.25 },
      { from: 52000000, to: 80000000,  rate: 0.30 },
      { from: 80000000, to: null,      rate: 0.35 },
    ],
  });

  // biểu 5 bậc từ 01/01/2026 (Luật 109/2025/QH15)
  await upsertTaxBracket({
    tenantId: null,
    name: 'Biểu thuế 5 bậc (từ 01/01/2026 — Luật 109/2025/QH15)',
    effectiveFrom: new Date('2026-01-01'),
    brackets: [
      { from: 0,          to: 10000000,  rate: 0.05 },
      { from: 10000000,   to: 30000000,  rate: 0.10 },
      { from: 30000000,   to: 50000000,  rate: 0.20 },
      { from: 50000000,   to: 100000000, rate: 0.30 },
      { from: 100000000,  to: null,      rate: 0.35 },
    ],
  });
  console.log('  ✓ TaxBracket (7 bậc + 5 bậc 2026) seeded');

  // 3. TaxDeductionConfig
  await upsertTaxDeduction({
    tenantId: null,
    effectiveFrom: new Date('2020-01-01'),
    selfDeduction: 11000000,
    dependentDeduction: 4400000,
  });
  await upsertTaxDeduction({
    tenantId: null,
    effectiveFrom: new Date('2026-01-01'),
    selfDeduction: 15500000,
    dependentDeduction: 6200000,
  });
  console.log('  ✓ TaxDeductionConfig (2020 + 2026) seeded');

  // 4. WageZoneConfig (Nghị định 74/2024/NĐ-CP từ 01/07/2024)
  await upsertWageZone({
    tenantId: null,
    effectiveFrom: new Date('2024-07-01'),
    zone1: 4960000,
    zone2: 4410000,
    zone3: 3860000,
    zone4: 3450000,
  });
  console.log('  ✓ WageZoneConfig (2024-07-01) seeded');

  // 5. AllowanceType
  const allowanceTypes = [
    { name: 'Phụ cấp ăn ca',       defaultAmount: 730000,  isBhxhExempt: true,  isPitExempt: true,  pitExemptCeiling: 730000 },
    { name: 'Phụ cấp điện thoại',  defaultAmount: 300000,  isBhxhExempt: true,  isPitExempt: true,  pitExemptCeiling: null },
    { name: 'Phụ cấp xăng xe',     defaultAmount: 500000,  isBhxhExempt: true,  isPitExempt: false, pitExemptCeiling: null },
    { name: 'Phụ cấp nhà ở',       defaultAmount: 1000000, isBhxhExempt: false, isPitExempt: false, pitExemptCeiling: null },
  ];
  for (const at of allowanceTypes) {
    await prisma.allowanceType.upsert({
      where: { name: at.name },
      update: {},
      create: at,
    });
  }
  console.log(`  ✓ ${allowanceTypes.length} AllowanceTypes seeded`);

  // 6. BonusType
  const bonusTypes = [
    { name: 'Thưởng Tết / Lương tháng 13',    isBhxhExempt: true  },
    { name: 'Thưởng dự án',                    isBhxhExempt: true  },
    { name: 'Thưởng KPI',                      isBhxhExempt: true  },
    { name: 'Thưởng hiệu quả công việc',        isBhxhExempt: false },
  ];
  for (const bt of bonusTypes) {
    await prisma.bonusType.upsert({
      where: { name: bt.name },
      update: {},
      create: bt,
    });
  }
  console.log(`  ✓ ${bonusTypes.length} BonusTypes seeded`);

  // 7. SalaryColumn — cột bảng lương mặc định
  const salaryColumns = [
    { name: 'Lương cơ bản (HĐLĐ)',         type: 'EARNING' as const, source: 'CONTRACT_SALARY' as const, formula: null, isBhxhExempt: false, isPitExempt: false, sortOrder: 1 },
    { name: 'Lương ngày công thực tế',       type: 'EARNING' as const, source: 'FORMULA' as const,         formula: '{contractSalary}/{standardDays}*{workDays}', isBhxhExempt: false, isPitExempt: false, sortOrder: 2 },
    { name: 'OT ngày thường (150%)',          type: 'EARNING' as const, source: 'FORMULA' as const,         formula: '{contractSalary}/{standardDays}/8*1.5*{otWeekday}', isBhxhExempt: false, isPitExempt: false, sortOrder: 5 },
    { name: 'OT cuối tuần (200%)',            type: 'EARNING' as const, source: 'FORMULA' as const,         formula: '{contractSalary}/{standardDays}/8*2.0*{otWeekend}', isBhxhExempt: false, isPitExempt: false, sortOrder: 6 },
    { name: 'OT lễ/Tết (300%)',              type: 'EARNING' as const, source: 'FORMULA' as const,         formula: '{contractSalary}/{standardDays}/8*3.0*{otHoliday}', isBhxhExempt: false, isPitExempt: false, sortOrder: 7 },
  ];
  for (const col of salaryColumns) {
    const exists = await prisma.salaryColumn.findFirst({ where: { name: col.name, tenantId: null } });
    if (!exists) {
      await prisma.salaryColumn.create({ data: { ...col, tenantId: null } });
    }
  }
  console.log(`  ✓ ${salaryColumns.length} SalaryColumns seeded`);

  console.log('\n✅ Epic 22 Payroll Compliance seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
