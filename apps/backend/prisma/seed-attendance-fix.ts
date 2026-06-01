import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Decimal } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper: tính metrics từ check-in/out
function calculateMetrics(
  checkIn: Date,
  checkOut: Date,
  plannedStart?: string,
  plannedEnd?: string,
): { lateMinutes: number; earlyLeaveMinutes: number; overtimeMinutes: number; dayCredit: number } {
  const toMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const checkInHour = checkIn.getHours();
  const checkInMin = checkIn.getMinutes();
  const checkInMinutes = checkInHour * 60 + checkInMin;

  const checkOutHour = checkOut.getHours();
  const checkOutMin = checkOut.getMinutes();
  const checkOutMinutes = checkOutHour * 60 + checkOutMin;

  const totalMinutes = (checkOutMinutes < checkInMinutes
    ? checkOutMinutes + 24 * 60
    : checkOutMinutes) - checkInMinutes;
  const totalHours = Math.max(0, totalMinutes / 60);
  const dayCredit = Math.min(1, totalHours / 8);

  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;

  if (plannedStart && plannedEnd) {
    const plannedStartMinutes = toMinutes(plannedStart);
    const plannedEndMinutes = toMinutes(plannedEnd);

    const adjustedPlannedEnd =
      plannedEndMinutes < plannedStartMinutes
        ? plannedEndMinutes + 24 * 60
        : plannedEndMinutes;
    const adjustedCheckOut =
      checkOutMinutes < checkInMinutes
        ? checkOutMinutes + 24 * 60
        : checkOutMinutes;

    lateMinutes = Math.max(0, checkInMinutes - plannedStartMinutes);
    earlyLeaveMinutes = Math.max(0, adjustedPlannedEnd - adjustedCheckOut);
    overtimeMinutes = Math.max(0, adjustedCheckOut - adjustedPlannedEnd);
  }

  return { lateMinutes, earlyLeaveMinutes, overtimeMinutes, dayCredit };
}

async function main() {
  console.log('🔧 Fixing Attendance Data...\n');

  // Lấy tất cả bản ghi có plannedStart/End + checkIn/Out
  const records = await prisma.attendanceRecord.findMany({
    where: {
      plannedStart: { not: null },
      plannedEnd: { not: null },
      checkIn: { not: null },
      checkOut: { not: null },
    },
  });

  console.log(`📋 Recalculating metrics for ${records.length} records...`);
  let updated = 0;

  for (const record of records) {
    const metrics = calculateMetrics(
      record.checkIn!,
      record.checkOut!,
      record.plannedStart ?? undefined,
      record.plannedEnd ?? undefined,
    );

    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        overtimeMinutes: metrics.overtimeMinutes,
        dayCredit: new Decimal(Math.round(metrics.dayCredit * 100) / 100),
      },
    });
    updated++;
  }

  console.log(`   ✓ ${updated} records recalculated\n`);

  // Sample data
  console.log('📊 Sample records (after fix):');
  const samples = await prisma.attendanceRecord.findMany({
    where: {
      plannedStart: { not: null },
      checkIn: { not: null },
      lateMinutes: { gt: 0 },
    },
    take: 5,
  });

  for (const s of samples) {
    const checkInTime = s.checkIn!.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    console.log(`  ${s.plannedStart} → ${checkInTime} | Late: ${s.lateMinutes}min | DayCredit: ${s.dayCredit}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ ATTENDANCE FIX COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
