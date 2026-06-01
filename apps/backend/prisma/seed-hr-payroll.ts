import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Decimal } from '../src/generated/prisma';
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
          type: ['PROBATION', 'FIXED_12', 'FIXED_24'][Math.floor(Math.random() * 3)] as any,
          startDate,
          endDate: Math.random() > 0.7 ? dayjs(startDate).add(3, 'years').toDate() : null,
          salaryMonthly: new Decimal(Math.floor(Math.random() * 15000000) + 5000000),
          signedAt: dayjs(startDate).subtract(7, 'days').toDate(),
          status: 'ACTIVE' as any,
        },
      });
      contractCount++;
    } catch (e) {
      console.error('❌ Contract error:', e.message);
    }
  }
  console.log(`   ✓ ${contractCount} contracts created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 2. HR DECISIONS (50 quyết định)
  // ─────────────────────────────────────────────────────────────────
  console.log('📋 Creating HR Decisions...');
  let decisionCount = 0;

  const decisionTypes = ['HIRE', 'TRANSFER', 'POSITION_CHANGE', 'SALARY_CHANGE', 'PROBATION_END'];
  const statuses = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];

  for (let i = 0; i < 50; i++) {
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const decisionType = decisionTypes[Math.floor(Math.random() * decisionTypes.length)];

    try {
      await prisma.hrDecision.create({
        data: {
          employeeId: emp.id,
          type: decisionType as any,
          content: `Decision: ${decisionType} effective from next month`,
          effectiveDate: dayjs().add(Math.random() * 30, 'days').toDate(),
          status: statuses[Math.floor(Math.random() * statuses.length)] as any,
          signedDate: dayjs().toDate(),
          notes: `Applied for: ${emp.fullName}`,
        },
      });
      decisionCount++;
    } catch (e) {
      console.error('❌ HrDecision error:', e.message);
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
    const dayCount = Math.floor(Math.random() * 5) + 1;

    try {
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          startDate,
          endDate: dayjs(startDate).add(dayCount, 'days').toDate(),
          days: new Decimal(dayCount),
          reason: ['Personal reason', 'Medical', 'Family', 'Vacation'][Math.floor(Math.random() * 4)],
          status: ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any,
        },
      });
      leaveCount++;
    } catch (e) {
      console.error('❌ LeaveRequest error:', e.message);
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
    const hours = Math.floor(Math.random() * 4) + 1;

    try {
      await prisma.overtimeRequest.create({
        data: {
          employeeId: emp.id,
          date: workDate,
          hours: new Decimal(hours),
          reason: ['Project deadline', 'Production issue', 'Client request'][Math.floor(Math.random() * 3)],
          status: ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any,
          dayType: 'WEEKDAY' as any,
        },
      });
      otCount++;
    } catch (e) {
      console.error('❌ OvertimeRequest error:', e.message);
    }
  }
  console.log(`   ✓ ${otCount} overtime requests created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 5. SALARY BANDS & COLUMNS (Skipped - complex schema)
  // ─────────────────────────────────────────────────────────────────
  console.log('💳 Salary Bands & Columns (skipped - require position mapping)\n');
  const salaryBands = [];
  const columns = [];

  // ─────────────────────────────────────────────────────────────────
  // 6. EMPLOYEE ALLOWANCES (Skipped - require payrollRecordId)
  // ─────────────────────────────────────────────────────────────────
  console.log('💰 Employee Allowances (skipped - linked to payroll records)\n');
  const allowanceCount = 0;

  // ─────────────────────────────────────────────────────────────────
  // 7. SALARY RECORDS (Skipped - covered by seed-comprehensive.ts)
  // ─────────────────────────────────────────────────────────────────
  console.log('📊 Salary Records (already seeded via seed-comprehensive.ts)\n');
  const salaryRecordCount = 0;

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
