import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Decimal } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Attendance Data...\n');

  const employees = await prisma.employee.findMany({ take: 100 });
  const users = await prisma.user.findMany({ take: 20 });

  if (employees.length === 0) {
    console.log('❌ No employees found. Run seed:mega first.');
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // 1. DAILY ATTENDANCE RECORDS (100 nhân viên × 60 ngày làm việc)
  // ─────────────────────────────────────────────────────────────────
  console.log('📅 Creating Daily Attendance Records...');
  let attendanceCount = 0;

  const startDate = dayjs().subtract(60, 'days');
  const endDate = dayjs();

  for (const emp of employees) {
    for (let d = startDate; d.isBefore(endDate); d = d.add(1, 'day')) {
      // Skip weekends
      const dayOfWeek = d.day();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const randomStatus = Math.random();
      let status: string;
      let checkIn: Date | null = null;
      let checkOut: Date | null = null;
      let plannedStart = '08:00';
      let plannedEnd = '17:00';

      // 85% PRESENT, 5% LATE, 3% ON_LEAVE, 2% ABSENT, 5% other
      if (randomStatus < 0.85) {
        status = 'PRESENT';
        const startHour = 7 + Math.floor(Math.random() * 3); // 7-10am
        const startMin = Math.floor(Math.random() * 60);
        checkIn = d.hour(startHour).minute(startMin).second(0).toDate();

        const endHour = 17 + Math.floor(Math.random() * 2); // 5-7pm
        const endMin = Math.floor(Math.random() * 60);
        checkOut = d.hour(endHour).minute(endMin).second(0).toDate();
      } else if (randomStatus < 0.90) {
        status = 'LATE';
        checkIn = d.hour(9 + Math.floor(Math.random() * 2)).minute(Math.floor(Math.random() * 60)).second(0).toDate();
        checkOut = d.hour(18).minute(0).second(0).toDate();
      } else if (randomStatus < 0.93) {
        status = 'ON_LEAVE';
      } else if (randomStatus < 0.95) {
        status = 'ABSENT';
      } else {
        status = ['BUSINESS_TRIP', 'ONSITE', 'HOLIDAY'][Math.floor(Math.random() * 3)];
      }

      const lateMinutes = status === 'LATE' ? Math.floor(Math.random() * 60) + 15 : 0;
      const earlyLeaveMinutes = Math.random() > 0.95 ? Math.floor(Math.random() * 60) + 15 : 0;
      const overtimeMinutes = status === 'PRESENT' && Math.random() > 0.8 ? Math.floor(Math.random() * 120) : 0;

      const totalHours = checkIn && checkOut
        ? new Decimal(Math.floor((checkOut.getTime() - checkIn.getTime()) / 3600000 * 10) / 10)
        : new Decimal(0);

      try {
        await prisma.attendanceRecord.create({
          data: {
            employeeId: emp.id,
            date: d.toDate(),
            checkIn,
            checkOut,
            plannedStart,
            plannedEnd,
            totalHours,
            status: status as any,
            lateMinutes,
            earlyLeaveMinutes,
            overtimeMinutes,
          },
        });
        attendanceCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`   ✓ ${attendanceCount} attendance records created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 2. ATTENDANCE EXPLANATIONS (Lý do đi trễ, về sớm, v.v.)
  // ─────────────────────────────────────────────────────────────────
  console.log('📝 Creating Attendance Explanations...');
  let explanationCount = 0;

  const explanationTypes = ['LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSING_CHECKIN', 'BUSINESS_TRIP', 'ONSITE', 'WFH'];
  const reasons = [
    'Kẹt xe trên đường',
    'Cuộc họp khách hàng bên ngoài',
    'Đón con từ trường',
    'Sự cố gia đình',
    'Bảo dưỡng xe',
    'Khám bác sĩ',
    'Công tác tại chi nhánh',
    'Làm việc từ nhà',
    'Tập trung dự án tại site khách',
  ];

  for (let i = 0; i < 80; i++) {
    const emp = employees[i % employees.length];
    const type = explanationTypes[Math.floor(Math.random() * explanationTypes.length)];
    const date = dayjs().subtract(Math.random() * 60, 'days').toDate();
    const reviewer = users[Math.floor(Math.random() * users.length)];

    try {
      await prisma.attendanceExplanation.create({
        data: {
          employeeId: emp.id,
          date,
          type: type as any,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          requestedCheckIn: ['MISSING_CHECKIN', 'LATE_ARRIVAL'].includes(type)
            ? dayjs(date).hour(8).minute(30).toDate()
            : undefined,
          requestedCheckOut: ['MISSING_CHECKOUT', 'EARLY_DEPARTURE'].includes(type)
            ? dayjs(date).hour(16).minute(0).toDate()
            : undefined,
          status: ['PENDING', 'APPROVED', 'REJECTED'][Math.floor(Math.random() * 3)] as any,
          reviewedById: Math.random() > 0.5 ? reviewer.id : undefined,
          reviewedAt: Math.random() > 0.5 ? dayjs(date).add(1, 'days').toDate() : undefined,
        },
      });
      explanationCount++;
    } catch (e) {
      // Skip errors
    }
  }
  console.log(`   ✓ ${explanationCount} attendance explanations created\n`);

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ ATTENDANCE SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`
📅 Attendance Records:    ${attendanceCount}
📝 Explanations:          ${explanationCount}
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
