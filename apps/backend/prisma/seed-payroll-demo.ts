/**
 * Demo data logic cho Epic 22 — Payroll Compliance
 * Tạo dữ liệu thực tế: hồ sơ thuế, NPT, kỳ lương mẫu với đầy đủ trạng thái
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PayrollStatus, PayrollPeriodType } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Làm tròn lên 100đ (BHXH/BHYT/BHTN theo Nghị định 115/2015)
function roundUp100(n: number): number {
  return Math.ceil(n / 100) * 100;
}

// Tính thuế TNCN lũy tiến (biểu 5 bậc 2026)
function calcPit5Bracket(taxable: number): number {
  if (taxable <= 0) return 0;
  const brackets = [
    { from: 0,          to: 10_000_000,  rate: 0.05 },
    { from: 10_000_000, to: 30_000_000,  rate: 0.10 },
    { from: 30_000_000, to: 50_000_000,  rate: 0.20 },
    { from: 50_000_000, to: 100_000_000, rate: 0.30 },
    { from: 100_000_000, to: Infinity,   rate: 0.35 },
  ];
  let tax = 0;
  for (const b of brackets) {
    if (taxable <= b.from) break;
    const inBracket = Math.min(taxable, b.to) - b.from;
    tax += inBracket * b.rate;
  }
  return Math.floor(tax); // làm tròn xuống đến đồng
}

async function main() {
  console.log('🌱 Creating payroll demo data...');

  // ── 1. Lấy nhân viên active ──────────────────────────────────────────────────
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      contracts: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' }, take: 1 },
    },
    take: 8, // lấy 8 NV đầu để demo
  });

  if (employees.length === 0) {
    console.log('  ⚠ Không có nhân viên active — bỏ qua demo data');
    return;
  }

  // ── 2. Tạo hồ sơ thuế cho từng NV ───────────────────────────────────────────
  const taxIds = ['0123456001', '0123456002', '0123456003', '0123456004',
                  '0123456005', '0123456006', '0123456007', '0123456008'];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    await prisma.employeeTaxProfile.upsert({
      where: { employeeId: emp.id },
      create: {
        employeeId: emp.id,
        taxId: taxIds[i],
        residencyStatus: 'RESIDENT',
        wageZone: i < 6 ? 1 : 2,
      },
      update: { taxId: taxIds[i] },
    });

    // 3 NV đầu có 1 NPT mỗi người
    if (i < 3) {
      const existsDep = await prisma.dependent.findFirst({ where: { employeeId: emp.id } });
      if (!existsDep) {
        await prisma.dependent.create({
          data: {
            employeeId: emp.id,
            name: `Con của ${emp.fullName.split(' ').pop()}`,
            relationship: 'Con ruột',
            taxId: `NPT${taxIds[i]}`,
            registeredFrom: new Date('2024-01-01'),
          },
        });
      }
    }
  }
  console.log(`  ✓ Hồ sơ thuế + NPT cho ${employees.length} nhân viên`);

  // ── 3. Lấy config active cho tháng 5/2026 ────────────────────────────────────
  const refDate = new Date('2026-05-31');

  const insuranceConfig = await prisma.insuranceConfig.findFirst({
    where: { effectiveFrom: { lte: refDate } },
    orderBy: { effectiveFrom: 'desc' },
  });
  const taxDeduction = await prisma.taxDeductionConfig.findFirst({
    where: { effectiveFrom: { lte: refDate } },
    orderBy: { effectiveFrom: 'desc' },
  });
  const taxBracket = await prisma.taxBracket.findFirst({
    where: { effectiveFrom: { lte: refDate } },
    orderBy: { effectiveFrom: 'desc' },
  });
  const allowanceTypes = await prisma.allowanceType.findMany({ where: { isActive: true } });

  if (!insuranceConfig || !taxDeduction) {
    console.log('  ⚠ Thiếu config — chạy seed-payroll.ts trước');
    return;
  }

  // ── 4. Tạo kỳ lương tháng 5/2026 (APPROVED — đã duyệt) ─────────────────────
  const existingApproved = await prisma.payrollPeriod.findFirst({
    where: { name: 'Lương tháng 5/2026', status: PayrollStatus.APPROVED },
  });

  let approvedPeriod = existingApproved;
  if (!approvedPeriod) {
    approvedPeriod = await prisma.payrollPeriod.create({
      data: {
        name: 'Lương tháng 5/2026',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-31'),
        status: PayrollStatus.APPROVED,
        type: PayrollPeriodType.REGULAR,
        processedAt: new Date('2026-06-03'),
      },
    });
    console.log('  ✓ PayrollPeriod tháng 5/2026 (APPROVED) tạo');
  }

  // ── 5. Tạo PayrollRecord cho từng NV trong kỳ APPROVED ──────────────────────
  const standardDays = 22; // tháng 5/2026 có 22 ngày làm việc

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const contract = emp.contracts[0];
    if (!contract) continue;

    const contractSalary = Number(contract.salaryMonthly);
    const isProbation = contract.type === 'PROBATION';
    const isFreelance = contract.type === 'PART_TIME';
    const baseSalary = isProbation ? contractSalary * 0.85 : contractSalary;

    const workDays = i === 0 ? 18 : 22; // NV đầu nghỉ 4 ngày
    const unpaidLeaveDays = i === 2 ? 3 : 0;
    const paidLeaveDays = i === 0 ? 4 : 0;
    const otWeekday = i === 1 ? 8 : 0;  // NV 2 OT 8h ngày thường

    // Gross theo bảng lương: lương ngày công + OT
    const daySalary = baseSalary / standardDays * workDays;
    const otPay = contractSalary / standardDays / 8 * 1.5 * otWeekday;
    const grossSalary = daySalary + otPay;

    // BHXH/BHYT/BHTN
    let bhxhEmployee = 0, bhytEmployee = 0, bhtnEmployee = 0;
    let bhxhEmployer = 0, bhytEmployer = 0, bhtnEmployer = 0, tnldEmployer = 0;

    if (!isFreelance && unpaidLeaveDays < 14) {
      const bhxhBase = Math.min(contractSalary, Number(insuranceConfig.wageBase) * insuranceConfig.bhxhCeilingMultiple);
      bhxhEmployee = roundUp100(bhxhBase * Number(insuranceConfig.bhxhEmployeeRate));
      bhytEmployee = roundUp100(bhxhBase * Number(insuranceConfig.bhytEmployeeRate));
      bhtnEmployee = roundUp100(bhxhBase * Number(insuranceConfig.bhtnEmployeeRate));
      bhxhEmployer = roundUp100(bhxhBase * Number(insuranceConfig.bhxhEmployerRate));
      bhytEmployer = roundUp100(bhxhBase * Number(insuranceConfig.bhytEmployerRate));
      bhtnEmployer = roundUp100(bhxhBase * Number(insuranceConfig.bhtnEmployerRate));
      tnldEmployer = roundUp100(bhxhBase * Number(insuranceConfig.tnldRate));
    }

    // Giảm trừ gia cảnh
    const dependentCount = i < 3 ? 1 : 0;
    const selfDeduction = Number(taxDeduction.selfDeduction);
    const dependentDeduction = Number(taxDeduction.dependentDeduction) * dependentCount;

    // Thu nhập tính thuế
    let taxableIncome = 0, pitAmount = 0;
    if (isFreelance) {
      pitAmount = grossSalary >= 2_000_000 ? Math.floor(grossSalary * 0.1) : 0;
    } else {
      taxableIncome = Math.max(0, grossSalary - bhxhEmployee - bhytEmployee - bhtnEmployee - selfDeduction - dependentDeduction);
      pitAmount = calcPit5Bracket(taxableIncome);
    }

    const netSalary = grossSalary - bhxhEmployee - bhytEmployee - bhtnEmployee - pitAmount;
    const totalLaborCost = grossSalary + bhxhEmployer + bhytEmployer + bhtnEmployer + tnldEmployer;

    const configSnapshot = {
      snapshotVersion: 1,
      insuranceConfigId: insuranceConfig.id,
      taxBracketId: taxBracket?.id,
      taxDeductionId: taxDeduction.id,
      bhxhEmployeeRate: Number(insuranceConfig.bhxhEmployeeRate),
      bhytEmployeeRate: Number(insuranceConfig.bhytEmployeeRate),
      bhtnEmployeeRate: Number(insuranceConfig.bhtnEmployeeRate),
      selfDeduction,
      dependentDeduction: Number(taxDeduction.dependentDeduction),
    };

    const existing = await prisma.payrollRecord.findFirst({
      where: { periodId: approvedPeriod.id, employeeId: emp.id },
    });

    if (!existing) {
      const record = await prisma.payrollRecord.create({
        data: {
          periodId: approvedPeriod.id,
          employeeId: emp.id,
          workDays,
          leaveDays: paidLeaveDays + unpaidLeaveDays,
          paidLeaveDays,
          unpaidLeaveDays,
          overtimeHours: otWeekday,
          overtimePayBreakdown: { weekday: otWeekday, weekend: 0, holiday: 0 },
          baseSalary,
          grossSalary,
          overtimePay: otPay,
          allowances: 0,
          deductions: 0,
          bonus: i === 1 ? 2_000_000 : 0, // NV 2 được thưởng
          bhxhEmployee,
          bhytEmployee,
          bhtnEmployee,
          bhxhEmployer,
          bhytEmployer,
          bhtnEmployer,
          tnldEmployer,
          taxableIncome,
          selfDeduction,
          dependentDeduction,
          dependentCount,
          pitAmount,
          totalLaborCost,
          netSalary,
          configSnapshot,
          overrideNote: i === 0 ? 'NV nghỉ phép 4 ngày — override từ HR' : null,
          note: isProbation ? 'Nhân viên thử việc — áp dụng 85%' : null,
        },
      });

      // Thêm phụ cấp ăn ca cho tất cả NV (trừ freelance)
      if (!isFreelance) {
        const anCaType = allowanceTypes.find(a => a.name === 'Phụ cấp ăn ca');
        if (anCaType) {
          await prisma.employeeAllowance.upsert({
            where: { payrollRecordId_allowanceTypeId: { payrollRecordId: record.id, allowanceTypeId: anCaType.id } },
            create: { payrollRecordId: record.id, allowanceTypeId: anCaType.id, amount: Number(anCaType.defaultAmount) },
            update: {},
          });
        }
      }
    }
  }
  console.log(`  ✓ ${employees.length} PayrollRecord tháng 5/2026 (APPROVED)`);

  // ── 6. Tạo kỳ lương tháng 6/2026 (REVIEWED — đang chờ duyệt) ───────────────
  const existingReviewed = await prisma.payrollPeriod.findFirst({
    where: { name: 'Lương tháng 6/2026' },
  });

  if (!existingReviewed) {
    const reviewedPeriod = await prisma.payrollPeriod.create({
      data: {
        name: 'Lương tháng 6/2026',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-30'),
        status: PayrollStatus.REVIEWED,
        type: PayrollPeriodType.REGULAR,
      },
    });

    // Tạo records đơn giản cho kỳ REVIEWED
    for (const emp of employees.slice(0, 5)) {
      const contract = emp.contracts[0];
      if (!contract) continue;
      const contractSalary = Number(contract.salaryMonthly);
      const grossSalary = contractSalary;
      const bhxhBase = Math.min(contractSalary, Number(insuranceConfig.wageBase) * 20);
      const bhxhEmployee = roundUp100(bhxhBase * 0.08);
      const bhytEmployee = roundUp100(bhxhBase * 0.015);
      const bhtnEmployee = roundUp100(bhxhBase * 0.01);
      const taxableIncome = Math.max(0, grossSalary - bhxhEmployee - bhytEmployee - bhtnEmployee - Number(taxDeduction.selfDeduction));
      const pitAmount = calcPit5Bracket(taxableIncome);
      const netSalary = grossSalary - bhxhEmployee - bhytEmployee - bhtnEmployee - pitAmount;

      await prisma.payrollRecord.upsert({
        where: { periodId_employeeId: { periodId: reviewedPeriod.id, employeeId: emp.id } },
        create: {
          periodId: reviewedPeriod.id,
          employeeId: emp.id,
          workDays: 22,
          leaveDays: 0,
          paidLeaveDays: 0,
          unpaidLeaveDays: 0,
          overtimeHours: 0,
          baseSalary: contractSalary,
          grossSalary,
          bhxhEmployee,
          bhytEmployee,
          bhtnEmployee,
          taxableIncome,
          selfDeduction: Number(taxDeduction.selfDeduction),
          pitAmount,
          netSalary,
          configSnapshot: { snapshotVersion: 1, insuranceConfigId: insuranceConfig.id },
        },
        update: {},
      });
    }
    console.log('  ✓ PayrollPeriod tháng 6/2026 (REVIEWED) + 5 records tạo');
  }

  // ── 7. Tạo kỳ lương tháng 7/2026 (DRAFT) ────────────────────────────────────
  const existingDraft = await prisma.payrollPeriod.findFirst({
    where: { name: 'Lương tháng 7/2026' },
  });
  if (!existingDraft) {
    await prisma.payrollPeriod.create({
      data: {
        name: 'Lương tháng 7/2026',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-31'),
        status: PayrollStatus.DRAFT,
        type: PayrollPeriodType.REGULAR,
      },
    });
    console.log('  ✓ PayrollPeriod tháng 7/2026 (DRAFT) tạo');
  }

  // ── 8. Cập nhật YTD cho kỳ APPROVED ─────────────────────────────────────────
  const approvedRecords = await prisma.payrollRecord.findMany({
    where: { periodId: approvedPeriod.id },
  });

  for (const rec of approvedRecords) {
    await prisma.employeeYearlyTaxSummary.upsert({
      where: { employeeId_year: { employeeId: rec.employeeId, year: 2026 } },
      create: {
        employeeId: rec.employeeId,
        year: 2026,
        ytdGross: rec.grossSalary,
        ytdTaxableIncome: rec.taxableIncome,
        ytdPitPaid: rec.pitAmount,
        ytdBhxhEmployee: rec.bhxhEmployee,
      },
      update: {
        ytdGross: { increment: rec.grossSalary },
        ytdTaxableIncome: { increment: rec.taxableIncome },
        ytdPitPaid: { increment: rec.pitAmount },
        ytdBhxhEmployee: { increment: rec.bhxhEmployee },
      },
    });
  }
  console.log(`  ✓ YTD 2026 cập nhật cho ${approvedRecords.length} nhân viên`);

  console.log('\n✅ Payroll demo data complete!');
  console.log('   Kỳ lương demo: tháng 5 (APPROVED) | tháng 6 (REVIEWED) | tháng 7 (DRAFT)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
