/**
 * E16G.5 — Seed kiểm thử lương tháng 13
 * 5 nhân viên đại diện cho các trường hợp đặc thù:
 *   1. Nhân viên thường (INDEFINITE) — đủ 12 tháng
 *   2. Nhân viên thử việc (PROBATION) — 2 tháng (bhxh=0 thử việc)
 *   3. Nhân viên freelance/SEASONAL — 6 tháng
 *   4. Nhân viên non-resident (NON_RESIDENT) — TNCN khấu lưu 20%, nhưng T13 dùng 10%
 *   5. Nhân viên có 2 người phụ thuộc — kiểm tra PIT = 0 khi net thấp
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PayrollStatus, PayrollPeriodType, ContractType, ContractStatus, Role } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────────────────────

function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

/** PIT 10% flat cho tháng 13 theo spec E16G.7 */
function calcPit13th(month13: number): number {
  return month13 >= 2_000_000 ? Math.round(month13 * 0.1) : 0;
}

function calcExpected(
  label: string,
  monthlyRecords: Array<{ baseSalary: number; overtimePay: number; bonus: number }>,
): void {
  const months = monthlyRecords.length;
  const totalBase = monthlyRecords.reduce((s, r) => s + r.baseSalary + r.overtimePay + r.bonus, 0);
  const month13 = Math.round(totalBase / months);
  const pit     = calcPit13th(month13);
  const net     = month13 - pit;
  console.log(`  [${label}]`);
  console.log(`    Số tháng BQ   : ${months}`);
  console.log(`    Tổng base     : ${totalBase.toLocaleString('vi-VN')} đ`);
  console.log(`    Lương T13 BQ  : ${month13.toLocaleString('vi-VN')} đ`);
  console.log(`    PIT 10%       : ${pit.toLocaleString('vi-VN')} đ`);
  console.log(`    Thực nhận     : ${net.toLocaleString('vi-VN')} đ`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== E16G.5: Seed payroll-verify ===\n');

  // ── 1. Lấy / tạo OrgUnit ────────────────────────────────────────────────────
  let orgUnit = await prisma.orgUnit.findFirst({ where: { code: 'ROOT' } });
  if (!orgUnit) {
    orgUnit = await prisma.orgUnit.create({ data: { name: 'Công ty', code: 'ROOT' } });
  }

  // ── 2. Lấy / tạo User + Employee cho 5 profile ───────────────────────────────

  const profiles = [
    {
      code:    'VERIFY01',
      name:    'Nguyễn Văn Thường',
      email:   'thuong.verify@loop.vn',
      contract: ContractType.INDEFINITE,
      monthly:  22_000_000,
      months:  12,         // đủ 12 tháng → T13 = BQ 12 tháng
      otPay:   500_000,    // OT nhỏ mỗi tháng
      bonus:   0,
      residency: 'RESIDENT' as const,
      dependents: 0,
    },
    {
      code:    'VERIFY02',
      name:    'Trần Thị Thử Việc',
      email:   'thuiviec.verify@loop.vn',
      contract: ContractType.PROBATION,
      monthly:  12_000_000,
      months:  2,          // chỉ 2 tháng thử việc
      otPay:   0,
      bonus:   0,
      residency: 'RESIDENT' as const,
      dependents: 0,
    },
    {
      code:    'VERIFY03',
      name:    'Lê Minh Freelance',
      email:   'freelance.verify@loop.vn',
      contract: ContractType.SEASONAL,
      monthly:  18_000_000,
      months:  6,          // hợp đồng 6 tháng
      otPay:   0,
      bonus:   1_000_000,  // có bonus
      residency: 'RESIDENT' as const,
      dependents: 0,
    },
    {
      code:    'VERIFY04',
      name:    'David Non-Resident',
      email:   'nonresident.verify@loop.vn',
      contract: ContractType.FIXED_12,
      monthly:  35_000_000,
      months:   8,
      otPay:   2_000_000,
      bonus:   0,
      residency: 'NON_RESIDENT' as const, // T13 vẫn PIT 10% per spec
      dependents: 0,
    },
    {
      code:    'VERIFY05',
      name:    'Phạm Thị Phụ Thuộc',
      email:   'phuthuoc.verify@loop.vn',
      contract: ContractType.INDEFINITE,
      monthly:  8_000_000,  // thu nhập thấp, T13 < 2tr không chịu thuế
      months:  10,
      otPay:   0,
      bonus:   0,
      residency: 'RESIDENT' as const,
      dependents: 2,        // 2 NPT → kiểm tra logic miễn PIT
    },
  ];

  const createdEmployees: Array<{ id: string; code: string; name: string }> = [];

  for (const p of profiles) {
    // Upsert User
    let user = await prisma.user.findFirst({ where: { email: p.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email:        p.email,
          name:         p.name,
          passwordHash: '$2b$10$fakehashedpassword1234567890abcde',
          role:         Role.MEMBER,
        },
      });
    }

    // Upsert Employee
    let emp = await prisma.employee.findFirst({ where: { email: p.email } });
    if (!emp) {
      emp = await prisma.employee.create({
        data: {
          code:      p.code,
          fullName:  p.name,
          email:     p.email,
          userId:    user.id,
          orgUnitId: orgUnit!.id,
          startDate: new Date('2025-01-01'),
          isActive:  true,
        },
      });
    }

    // Upsert Contract ACTIVE
    const existsContract = await prisma.contract.findFirst({
      where: { employeeId: emp.id, status: ContractStatus.ACTIVE },
    });
    if (!existsContract) {
      await prisma.contract.create({
        data: {
          employeeId:    emp.id,
          type:          p.contract,
          status:        ContractStatus.ACTIVE,
          salaryMonthly: p.monthly,
          startDate:     new Date('2025-01-01'),
        },
      });
    }

    // Upsert EmployeeTaxProfile
    await prisma.employeeTaxProfile.upsert({
      where:  { employeeId: emp.id },
      create: { employeeId: emp.id, residencyStatus: p.residency, wageZone: 1 },
      update: { residencyStatus: p.residency },
    });

    // Upsert Dependents
    if (p.dependents > 0) {
      for (let d = 0; d < p.dependents; d++) {
        const existsDep = await prisma.dependent.findFirst({
          where: { employeeId: emp.id, name: `NPT ${d + 1} của ${p.name.split(' ').pop()}` },
        });
        if (!existsDep) {
          await prisma.dependent.create({
            data: {
              employeeId:     emp.id,
              name:           `NPT ${d + 1} của ${p.name.split(' ').pop()}`,
              relationship:   'Con ruột',
              registeredFrom: new Date('2025-01-01'),
            },
          });
        }
      }
    }

    createdEmployees.push({ id: emp.id, code: p.code, name: p.name });
    console.log(`  ✓ ${p.code} — ${p.name} (${p.contract}, ${p.months} tháng, BH: ${p.residency})`);
  }

  // ── 3. Tạo kỳ REGULAR APPROVED tháng 1-12/2025 cho mỗi NV ────────────────────
  console.log('\n[Tạo kỳ lương REGULAR APPROVED]');

  // Bảng tháng: 12 kỳ tháng 1–12/2025
  const monthDefs = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    name: `[VERIFY] Lương tháng ${i + 1}/2025`,
    start: new Date(2025, i, 1),
    end:   new Date(2025, i + 1, 0), // ngày cuối tháng
  }));

  // Profile → tháng active của từng người
  const profileMonthMap: Record<number, number[]> = {
    0: [1,2,3,4,5,6,7,8,9,10,11,12],   // VERIFY01 — 12 tháng
    1: [1,2],                             // VERIFY02 — 2 tháng thử việc
    2: [4,5,6,7,8,9],                    // VERIFY03 — freelance tháng 4-9
    3: [3,4,5,6,7,8,9,10],              // VERIFY04 — non-resident tháng 3-10
    4: [1,2,3,4,5,6,7,8,9,10],         // VERIFY05 — 10 tháng
  };

  for (let pi = 0; pi < profiles.length; pi++) {
    const p   = profiles[pi];
    const emp = createdEmployees[pi];
    const activeMonths = profileMonthMap[pi];

    for (const mIdx of activeMonths) {
      const md = monthDefs[mIdx - 1];

      // Upsert kỳ lương (shared giữa NV)
      let period = await prisma.payrollPeriod.findFirst({
        where: { name: md.name, type: PayrollPeriodType.REGULAR, status: PayrollStatus.APPROVED },
      });
      if (!period) {
        period = await prisma.payrollPeriod.create({
          data: {
            name:      md.name,
            startDate: md.start,
            endDate:   md.end,
            status:    PayrollStatus.APPROVED,
            type:      PayrollPeriodType.REGULAR,
          },
        });
      }

      // Tính BH (thử việc = 0 bhxh theo Luật BHXH 2014)
      const isProbation = p.contract === ContractType.PROBATION;
      const bhxhRate    = isProbation ? 0 : 0.08;
      const bhytRate    = isProbation ? 0 : 0.015;
      const bhtnRate    = isProbation ? 0 : 0.01;
      const bhBase      = Math.min(p.monthly, 36_000_000); // ceiling BHXH
      const bhxhEmp     = roundUp100(bhBase * bhxhRate);
      const bhytEmp     = roundUp100(bhBase * bhytRate);
      const bhtnEmp     = roundUp100(bhBase * bhtnRate);

      const gross       = p.monthly + p.otPay + p.bonus;
      const bhTotal     = bhxhEmp + bhytEmp + bhtnEmp;
      const selfDed     = 11_000_000;
      const depDed      = p.dependents * 4_400_000;
      const taxable     = Math.max(0, gross - bhTotal - selfDed - depDed);

      // PIT lũy tiến (kỳ thường)
      let pit = 0;
      const brackets = [
        { from: 0,           to: 10_000_000,  rate: 0.05 },
        { from: 10_000_000,  to: 30_000_000,  rate: 0.10 },
        { from: 30_000_000,  to: 50_000_000,  rate: 0.20 },
        { from: 50_000_000,  to: 100_000_000, rate: 0.30 },
        { from: 100_000_000, to: Infinity,    rate: 0.35 },
      ];
      if (p.residency === 'NON_RESIDENT') {
        pit = Math.round(gross * 0.20);
      } else {
        for (const b of brackets) {
          if (taxable <= b.from) break;
          const inBracket = Math.min(taxable, b.to) - b.from;
          pit += inBracket * b.rate;
        }
        pit = Math.floor(pit);
      }

      const net = gross - bhTotal - pit;

      // Upsert PayrollRecord
      await prisma.payrollRecord.upsert({
        where: { periodId_employeeId: { periodId: period.id, employeeId: emp.id } },
        create: {
          periodId:          period.id,
          employeeId:        emp.id,
          workDays:          22,
          baseSalary:        p.monthly,
          overtimePay:       p.otPay,
          allowances:        0,
          bonus:             p.bonus,
          grossSalary:       gross,
          bhxhEmployee:      bhxhEmp,
          bhytEmployee:      bhytEmp,
          bhtnEmployee:      bhtnEmp,
          bhxhEmployer:      0,
          bhytEmployer:      0,
          bhtnEmployer:      0,
          tnldEmployer:      0,
          taxableIncome:     taxable,
          selfDeduction:     selfDed,
          dependentDeduction: depDed,
          dependentCount:    p.dependents,
          pitAmount:         pit,
          totalLaborCost:    gross,
          netSalary:         net,
        },
        update: {
          baseSalary:    p.monthly,
          overtimePay:   p.otPay,
          bonus:         p.bonus,
          grossSalary:   gross,
          bhxhEmployee:  bhxhEmp,
          bhytEmployee:  bhytEmp,
          bhtnEmployee:  bhtnEmp,
          taxableIncome: taxable,
          pitAmount:     pit,
          netSalary:     net,
        },
      });
    }
    console.log(`  ✓ ${emp.code} — ${activeMonths.length} kỳ REGULAR APPROVED`);
  }

  // ── 4. Tạo kỳ MONTH_13 cho năm 2025 ────────────────────────────────────────
  console.log('\n[Tạo kỳ MONTH_13 năm 2025]');
  const month13Period = await prisma.payrollPeriod.upsert({
    where: { id: 'verify-month13-2025' },
    create: {
      id:        'verify-month13-2025',
      name:      '[VERIFY] Lương tháng 13 / 2025',
      startDate: new Date('2025-12-25'),
      endDate:   new Date('2025-12-31'),
      status:    PayrollStatus.DRAFT,
      type:      PayrollPeriodType.MONTH_13,
    },
    update: {},
  });
  console.log(`  ✓ Kỳ MONTH_13 id=${month13Period.id}`);

  // ── 5. In expected results ───────────────────────────────────────────────────
  console.log('\n=== KẾT QUẢ DỰ KIẾN (để kiểm thử API calculate-13th) ===\n');

  const monthlyDataMap = [
    { label: 'VERIFY01 (Thường 12 tháng)', records: Array.from({ length: 12 }, () => ({ baseSalary: 22_000_000, overtimePay: 500_000, bonus: 0 })) },
    { label: 'VERIFY02 (Thử việc 2 tháng)', records: Array.from({ length: 2 }, () => ({ baseSalary: 12_000_000, overtimePay: 0, bonus: 0 })) },
    { label: 'VERIFY03 (Freelance 6 tháng +bonus)', records: Array.from({ length: 6 }, () => ({ baseSalary: 18_000_000, overtimePay: 0, bonus: 1_000_000 })) },
    { label: 'VERIFY04 (Non-Resident 8 tháng)', records: Array.from({ length: 8 }, () => ({ baseSalary: 35_000_000, overtimePay: 2_000_000, bonus: 0 })) },
    { label: 'VERIFY05 (2 NPT 10 tháng)', records: Array.from({ length: 10 }, () => ({ baseSalary: 8_000_000, overtimePay: 0, bonus: 0 })) },
  ];

  for (const md of monthlyDataMap) {
    calcExpected(md.label, md.records);
    console.log('');
  }

  console.log('=== GHI CHÚ ===');
  console.log('  - T13 = sum(baseSalary + overtimePay + bonus) / months');
  console.log('  - PIT = 10% nếu T13 >= 2.000.000 đ, else 0 (bhxh=0 cho T13)');
  console.log('  - VERIFY05: T13 = 8.000.000, PIT = 10% = 800.000, Net = 7.200.000');
  console.log('  - VERIFY02: thử việc 2 tháng → T13 BQ = 12.000.000, PIT = 1.200.000');
  console.log('\n  ▶ Gọi API: POST /api/v1/payroll/periods/verify-month13-2025/calculate-13th');
  console.log('    để kiểm tra kết quả thực tế với dữ liệu đã seed.\n');

  console.log('✅ E16G.5 seed xong!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
