import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';

const Decimal = Prisma.Decimal;
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mức giảm trừ 2024
const SELF_DEDUCTION = 11_000_000;
const DEPENDENT_DEDUCTION = 4_400_000;
// Trần đóng BHXH/BHYT = 20 × lương cơ sở (2.34tr) = 46.8tr; BHTN = 20 × LtốiThiểuVùng1 (4.96tr) = 99.2tr
const INS_CAP = 46_800_000;
const BHTN_CAP = 99_200_000;

// Thuế TNCN lũy tiến tháng (VND)
function calcPIT(taxable: number): number {
  if (taxable <= 0) return 0;
  const brackets = [
    [5_000_000, 0.05], [5_000_000, 0.10], [8_000_000, 0.15],
    [14_000_000, 0.20], [20_000_000, 0.25], [28_000_000, 0.30], [Infinity, 0.35],
  ] as const;
  let remain = taxable, tax = 0;
  for (const [size, rate] of brackets) {
    const part = Math.min(remain, size);
    tax += part * rate;
    remain -= part;
    if (remain <= 0) break;
  }
  return Math.round(tax);
}

async function main() {
  console.log('🌱 Bồi đủ cấu phần lương cho phiếu lương...\n');

  // Chỉ xử lý bản ghi còn thiếu cấu phần (bhxhEmployee = 0) nhưng có gross
  const records = await prisma.payrollRecord.findMany({
    where: { bhxhEmployee: 0, grossSalary: { gt: 0 } },
    select: { id: true, grossSalary: true, overtimeHours: true, dependentCount: true },
  });
  console.log(`   Tìm thấy ${records.length} phiếu cần bồi cấu phần.`);

  let done = 0;
  for (const r of records) {
    const gross = Number(r.grossSalary);
    const allowances = Math.round(gross * 0.15);          // phụ cấp 15%
    const overtimePay = Number(r.overtimeHours) > 0 ? Math.round(gross * 0.05) : 0;
    const baseSalary = gross - allowances - overtimePay;  // lương theo công

    const insBase = Math.min(gross, INS_CAP);
    const bhtnBase = Math.min(gross, BHTN_CAP);
    const bhxhEmployee = Math.round(insBase * 0.08);
    const bhytEmployee = Math.round(insBase * 0.015);
    const bhtnEmployee = Math.round(bhtnBase * 0.01);
    const bhxhEmployer = Math.round(insBase * 0.175);
    const bhytEmployer = Math.round(insBase * 0.03);
    const bhtnEmployer = Math.round(bhtnBase * 0.01);
    const tnldEmployer = Math.round(insBase * 0.005);     // TNLĐ-BNN 0.5%
    const insEmployee = bhxhEmployee + bhytEmployee + bhtnEmployee;

    const depCount = r.dependentCount ?? 0;
    const dependentDeduction = depCount * DEPENDENT_DEDUCTION;
    const taxableIncome = Math.max(0, gross - insEmployee - SELF_DEDUCTION - dependentDeduction);
    const pitAmount = calcPIT(taxableIncome);
    const netSalary = gross - insEmployee - pitAmount;
    const totalLaborCost = gross + bhxhEmployer + bhytEmployer + bhtnEmployer + tnldEmployer;

    await prisma.payrollRecord.update({
      where: { id: r.id },
      data: {
        baseSalary: new Decimal(baseSalary),
        allowances: new Decimal(allowances),
        overtimePay: new Decimal(overtimePay),
        bhxhEmployee: new Decimal(bhxhEmployee),
        bhytEmployee: new Decimal(bhytEmployee),
        bhtnEmployee: new Decimal(bhtnEmployee),
        bhxhEmployer: new Decimal(bhxhEmployer),
        bhytEmployer: new Decimal(bhytEmployer),
        bhtnEmployer: new Decimal(bhtnEmployer),
        tnldEmployer: new Decimal(tnldEmployer),
        selfDeduction: new Decimal(SELF_DEDUCTION),
        dependentDeduction: new Decimal(dependentDeduction),
        taxableIncome: new Decimal(taxableIncome),
        pitAmount: new Decimal(pitAmount),
        netSalary: new Decimal(netSalary),
        totalLaborCost: new Decimal(totalLaborCost),
      },
    });
    done++;
  }

  console.log(`   ✓ ${done} phiếu lương đã đủ cấu phần (lương cơ bản, phụ cấp, OT, BHXH/BHYT/BHTN, TNCN, thực nhận).`);
  console.log('\n✅ Hoàn tất bồi cấu phần phiếu lương!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
