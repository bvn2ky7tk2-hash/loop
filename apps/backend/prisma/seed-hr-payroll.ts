import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding HR + Payroll Data...\n');

  const employees = await prisma.employee.findMany({ take: 100 });
  const users = await prisma.user.findMany({ take: 20 });

  // ─────────────────────────────────────────────────────────────────
  // 1. CONTRACTS (100 hợp đồng)
  // ─────────────────────────────────────────────────────────────────
  console.log('📄 Creating Contracts...');
  let contractCount = 0;

  for (const emp of employees) {
    const startDate = dayjs().subtract(Math.random() * 1000, 'days').toDate();

    try {
      await prisma.contract.create({
        data: {
          employeeId: emp.id,
          contractType: ['PERMANENT', 'FIXED_TERM', 'PROBATION'][Math.floor(Math.random() * 3)] as any,
          startDate,
          endDate: Math.random() > 0.7 ? dayjs(startDate).add(3, 'years').toDate() : null,
          baseSalary: Math.floor(Math.random() * 15000000) + 5000000,
          signingDate: dayjs(startDate).subtract(7, 'days').toDate(),
          status: 'ACTIVE' as any,
          workSchedule: 'FULL_TIME' as any,
        },
      });
      contractCount++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${contractCount} contracts created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 2. HR DECISIONS (50 quyết định)
  // ─────────────────────────────────────────────────────────────────
  console.log('📋 Creating HR Decisions...');
  let decisionCount = 0;

  const decisionTypes = ['PROMOTION', 'SALARY_INCREASE', 'TRANSFER', 'DEMOTION', 'SALARY_DECREASE'];
  const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED'];

  for (let i = 0; i < 50; i++) {
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const approver = users[Math.floor(Math.random() * users.length)];
    const decisionType = decisionTypes[Math.floor(Math.random() * decisionTypes.length)];

    try {
      await prisma.hrDecision.create({
        data: {
          employeeId: emp.id,
          decisionType: decisionType as any,
          title: `${decisionType} - ${emp.fullName}`,
          description: `Decision: ${decisionType} effective from next month`,
          effectiveDate: dayjs().add(Math.random() * 30, 'days').toDate(),
          status: statuses[Math.floor(Math.random() * statuses.length)] as any,
          createdByUserId: approver.id,
          details: {
            reason: 'Performance improvement',
            impact: decisionType.includes('SALARY') ? 'Salary adjustment' : 'Role change',
          },
        },
      });
      decisionCount++;
    } catch (e) {
      // Skip if error
    }
  }
  console.log(`   ✓ ${decisionCount} HR decisions created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 3. LEAVE REQUESTS (100 đơn xin phép)
  // ─────────────────────────────────────────────────────────────────
  console.log('🏖️  Creating Leave Requests...');
  let leaveCount = 0;

  const leaveTypes = await prisma.leaveType.findMany({ take: 5 });

  for (let i = 0; i < 100; i++) {
    const emp = employees[i % employees.length];
    const leaveType = leaveTypes[i % leaveTypes.length] || leaveTypes[0];
    const startDate = dayjs().add(Math.random() * 60, 'days').toDate();

    try {
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          startDate,
          endDate: dayjs(startDate).add(Math.floor(Math.random() * 5) + 1, 'days').toDate(),
          dayCount: Math.floor(Math.random() * 5) + 1,
          reason: ['Personal reason', 'Medical', 'Family', 'Vacation'][Math.floor(Math.random() * 4)],
          status: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 4)] as any,
          requestDate: dayjs().toDate(),
        },
      });
      leaveCount++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${leaveCount} leave requests created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 4. OVERTIME REQUESTS (50 đơn OT)
  // ─────────────────────────────────────────────────────────────────
  console.log('⏰ Creating Overtime Requests...');
  let otCount = 0;

  for (let i = 0; i < 50; i++) {
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const workDate = dayjs().subtract(Math.random() * 30, 'days').toDate();

    try {
      await prisma.overtimeRequest.create({
        data: {
          employeeId: emp.id,
          workDate,
          hours: Math.floor(Math.random() * 4) + 1,
          reason: ['Project deadline', 'Production issue', 'Client request'][Math.floor(Math.random() * 3)],
          status: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 4)] as any,
          requestDate: dayjs().toDate(),
        },
      });
      otCount++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${otCount} overtime requests created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 5. SALARY BANDS & COLUMNS
  // ─────────────────────────────────────────────────────────────────
  console.log('💳 Creating Salary Bands & Columns...');

  const salaryBands = [];
  for (let i = 0; i < 10; i++) {
    try {
      const band = await prisma.salaryBand.create({
        data: {
          code: `BAND-${String.fromCharCode(65 + i)}`,
          name: `Salary Band ${String.fromCharCode(65 + i)}`,
          minSalary: Math.floor(5000000 + i * 2000000),
          maxSalary: Math.floor(15000000 + i * 3000000),
        },
      });
      salaryBands.push(band);
    } catch (e) {
      // Skip duplicates
    }
  }

  const columnDefs = [
    { code: 'BASIC', name: 'Basic Salary', type: 'BASIC' },
    { code: 'ALLOWANCE', name: 'Allowances', type: 'ALLOWANCE' },
    { code: 'OT_PAY', name: 'Overtime Pay', type: 'OT' },
    { code: 'BONUS', name: 'Bonus', type: 'BONUS' },
    { code: 'BHXH', name: 'Social Insurance', type: 'DEDUCTION' },
    { code: 'TAX', name: 'Income Tax', type: 'DEDUCTION' },
  ];

  const columns = [];
  for (const col of columnDefs) {
    try {
      const column = await prisma.salaryColumn.create({
        data: {
          code: col.code,
          name: col.name,
          columnType: col.type as any,
          formula: '',
        },
      });
      columns.push(column);
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${salaryBands.length} salary bands + ${columns.length} columns\n`);

  // ─────────────────────────────────────────────────────────────────
  // 6. EMPLOYEE ALLOWANCES (500 phụ cấp)
  // ─────────────────────────────────────────────────────────────────
  console.log('💰 Creating Employee Allowances...');
  let allowanceCount = 0;

  const allowanceTypes = await prisma.allowanceType.findMany({ take: 5 });

  if (allowanceTypes.length > 0) {
    for (let i = 0; i < 200; i++) {
      const emp = employees[i % employees.length];
      const allowanceType = allowanceTypes[i % allowanceTypes.length];

      try {
        await prisma.employeeAllowance.create({
          data: {
            employeeId: emp.id,
            allowanceTypeId: allowanceType.id,
            amount: Math.floor(Math.random() * 5000000) + 500000,
            effectiveDate: dayjs().subtract(Math.random() * 100, 'days').toDate(),
            status: 'ACTIVE' as any,
          },
        });
        allowanceCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`   ✓ ${allowanceCount} employee allowances created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 7. SALARY RECORDS (Chi tiết lương - 300+)
  // ─────────────────────────────────────────────────────────────────
  console.log('📊 Creating Salary Records (detailed)...');
  let salaryRecordCount = 0;

  const periods = await prisma.payrollPeriod.findMany({ take: 3 });

  if (columns.length > 0 && periods.length > 0) {
    for (const period of periods) {
      for (const emp of employees.slice(0, 50)) {
        const baseSalary = Math.floor(Math.random() * 15000000) + 5000000;
        const allowance = Math.floor(Math.random() * 3000000);
        const otPay = Math.floor(Math.random() * 5000000);
        const bonus = Math.random() > 0.6 ? Math.floor(Math.random() * 3000000) : 0;
        const bhxh = Math.floor(baseSalary * 0.08);
        const tax = Math.floor((baseSalary + allowance + otPay + bonus - bhxh) * 0.05);

        const salaryData = {};
        salaryData[columns[0].id] = baseSalary;
        salaryData[columns[1].id] = allowance;
        salaryData[columns[2].id] = otPay;
        salaryData[columns[3].id] = bonus;
        salaryData[columns[4].id] = bhxh;
        salaryData[columns[5].id] = tax;

        try {
          await prisma.salaryRecord.create({
            data: {
              employeeId: emp.id,
              periodId: period.id,
              columnData: salaryData,
              totalEarnings: baseSalary + allowance + otPay + bonus,
              totalDeductions: bhxh + tax,
              netSalary: baseSalary + allowance + otPay + bonus - bhxh - tax,
              status: 'FINALIZED' as any,
            },
          });
          salaryRecordCount++;
        } catch (e) {
          // Skip duplicates
        }
      }
    }
  }
  console.log(`   ✓ ${salaryRecordCount} salary records created\n`);

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ HR + PAYROLL SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`
📄 Contracts:             ${contractCount}
📋 HR Decisions:          ${decisionCount}
🏖️  Leave Requests:        ${leaveCount}
⏰ Overtime Requests:      ${otCount}
💳 Salary Bands & Cols:   ${salaryBands.length} + ${columns.length}
💰 Employee Allowances:   ${allowanceCount}
📊 Salary Records:        ${salaryRecordCount}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
