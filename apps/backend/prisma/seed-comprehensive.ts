import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Comprehensive Data...\n');

  // ─────────────────────────────────────────────────────────────────
  // 1. TASKS — Update with dates, hours, statuses
  // ─────────────────────────────────────────────────────────────────
  console.log('📋 Updating Tasks with dates & hours...');
  const tasks = await prisma.task.findMany({ take: 1000 });
  let taskCount = 0;

  for (const task of tasks) {
    const startDate = dayjs()
      .subtract(Math.random() * 60, 'days')
      .toDate();
    const dueDate = dayjs(startDate)
      .add(Math.random() * 30 + 5, 'days')
      .toDate();
    const progress = Math.floor(Math.random() * 100);
    const estimateHours = Math.floor(Math.random() * 40) + 8;

    const statuses = ['TODO', 'IN_PROGRESS', 'PENDING_APPROVAL', 'DONE', 'CANCELLED'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    await prisma.task.update({
      where: { id: task.id },
      data: {
        startDate,
        dueDate,
        progress,
        estimateHours,
        status: status as any,
      },
    });
    taskCount++;
  }
  console.log(`   ✓ ${taskCount} tasks updated with dates & hours\n`);

  // ─────────────────────────────────────────────────────────────────
  // 2. BUGS — Create with priority, severity, dates
  // ─────────────────────────────────────────────────────────────────
  console.log('🐛 Creating Bugs...');
  const projects = await prisma.project.findMany({ take: 10 });
  const users = await prisma.user.findMany({ take: 20 });
  const bugTitles = [
    'Login button not responding',
    'Data export fails with 500 error',
    'Dashboard charts not loading',
    'Email notification delays',
    'Search filter returns wrong results',
    'Mobile layout broken on iOS',
    'API timeout on large payroll batches',
    'Permission denied on file upload',
    'Calendar events not syncing',
    'Report generation memory leak',
  ];

  let bugCount = 0;
  for (let i = 0; i < Math.min(50, projects.length * 5); i++) {
    const project = projects[i % projects.length];
    const severity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)];
    const status = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'][Math.floor(Math.random() * 4)];

    const createdAt = dayjs()
      .subtract(Math.random() * 30, 'days')
      .toDate();
    const resolvedAt =
      status === 'CLOSED' || status === 'RESOLVED'
        ? dayjs(createdAt)
            .add(Math.random() * 7, 'days')
            .toDate()
        : null;

    const reporter = users[Math.floor(Math.random() * users.length)];
    await prisma.bug.create({
      data: {
        project: { connect: { id: project.id } },
        reporter: { connect: { id: reporter.id } },
        title: bugTitles[i % bugTitles.length] + ` #${i}`,
        description: `Bug reported in ${project.code}. Impact: ${severity}`,
        severity: severity as any,
        status: status as any,
        createdAt,
        resolvedAt,
      },
    });
    bugCount++;
  }
  console.log(`   ✓ ${bugCount} bugs created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 3. PAYROLL PERIODS & RECORDS
  // ─────────────────────────────────────────────────────────────────
  console.log('💰 Creating Payroll Periods & Records...');
  const employees = await prisma.employee.findMany({ take: 100 });
  const orgUnit = await prisma.orgUnit.findFirst();

  // Create 3 payroll periods (last 3 months)
  const periods = [];
  for (let m = 0; m < 3; m++) {
    const month = dayjs().subtract(m, 'months');
    const period = await prisma.payrollPeriod.create({
      data: {
        name: `Tháng ${month.format('MM')}/2026`,
        startDate: month.startOf('month').toDate(),
        endDate: month.endOf('month').toDate(),
        type: 'REGULAR' as any,
        status: (m === 0 ? 'PAID' : m === 1 ? 'PROCESSING' : 'DRAFT') as any,
      },
    });
    periods.push(period);
  }
  console.log(`   ✓ ${periods.length} payroll periods created`);

  // Create payroll records
  let recordCount = 0;
  for (const period of periods) {
    for (const emp of employees) {
      const baseSalary = Math.floor(Math.random() * 15000000) + 5000000; // 5M-20M VND
      const overtime = Math.floor(Math.random() * 100) * 50000; // OT hours * rate

      // Calculate working days in period
      let workDays = 0;
      const startDate = dayjs(period.startDate);
      const endDate = dayjs(period.endDate);
      for (let d = startDate; d.isBefore(endDate) || d.isSame(endDate); d = d.add(1, 'day')) {
        const dayOfWeek = d.day();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workDays++;
        }
      }

      const grossSalary = baseSalary + overtime;
      const pitAmount = Math.floor(grossSalary * 0.05); // 5% PIT
      const bhxhEmployee = Math.floor(baseSalary * 0.08); // 8% BHXH
      const bhytEmployee = Math.floor(baseSalary * 0.015); // 1.5% BHYT
      const totalDeductions = bhxhEmployee + bhytEmployee + pitAmount;
      const netSalary = grossSalary - totalDeductions;

      await prisma.payrollRecord.create({
        data: {
          employeeId: emp.id,
          periodId: period.id,
          workDays: workDays,
          leaveDays: Math.floor(Math.random() * 5),
          baseSalary,
          grossSalary,
          bonus: Math.random() > 0.7 ? Math.floor(Math.random() * 2000000) : 0,
          overtimeHours: Math.floor(Math.random() * 40),
          overtimePay: overtime,
          deductions: totalDeductions,
          bhxhEmployee,
          bhytEmployee,
          bhtnEmployee: Math.floor(baseSalary * 0.01), // 1% BHTN
          pitAmount,
          netSalary,
        },
      });
      recordCount++;
    }
  }
  console.log(`   ✓ ${recordCount} payroll records created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 4. TIMESHEET RECORDS
  // ─────────────────────────────────────────────────────────────────
  console.log('⏱️  Creating Timesheet Records...');
  let sheetCount = 0;

  for (const user of users.slice(0, Math.min(20, users.length))) {
    // Create timesheets for last 3 months
    for (let m = 0; m < 3; m++) {
      const month = dayjs().subtract(m, 'months');
      let workingDays = 0;

      // Count working days in the month
      for (let d = 1; d <= month.daysInMonth(); d++) {
        const date = month.date(d);
        const dayOfWeek = date.day();
        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++;
        }
      }

      const status = m === 0 ? 'DRAFT' : 'APPROVED';
      const approver = users[Math.floor(Math.random() * users.length)];

      await prisma.timesheetRecord.create({
        data: {
          user: { connect: { id: user.id } },
          periodStart: month.startOf('month').toDate(),
          periodEnd: month.endOf('month').toDate(),
          workingDays,
          standardDays: Math.floor(workingDays * 0.9),
          overtimeHours: Math.floor(Math.random() * 40),
          leaveDays: Math.floor(Math.random() * 3),
          unpaidLeaveDays: Math.floor(Math.random() * 2),
          status: status as any,
          submittedAt: status === 'APPROVED' ? month.endOf('month').toDate() : null,
          approvedAt:
            status === 'APPROVED'
              ? dayjs(month.endOf('month'))
                  .add(2, 'days')
                  .toDate()
              : null,
          approvedBy: status === 'APPROVED' ? { connect: { id: approver.id } } : undefined,
        },
      });
      sheetCount++;
    }
  }
  console.log(`   ✓ ${sheetCount} timesheet records created\n`);

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ COMPREHENSIVE SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`
📋 Tasks:              ${taskCount} updated with dates & hours
🐛 Bugs:               ${bugCount} created
💰 Payroll Periods:    ${periods.length} created
💳 Payroll Records:    ${recordCount} created
⏱️  Timesheet Records:  ${sheetCount} created
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
