import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env['DATABASE_URL'] })) });

const isoWeekday = (d: Date) => { const x = d.getUTCDay(); return x === 0 ? 7 : x; };

async function main() {
  console.log('🌱 Seed mẫu công chuẩn theo thứ trong tuần...\n');

  // 1. Upsert 2 ca với workingDays
  const _office = await prisma.workShift.findFirst({ where: { code: 'HC-OFFICE' } });
  const office = _office
    ? await prisma.workShift.update({ where: { id: _office.id }, data: { workingDays: [1, 2, 3, 4, 5] } })
    : await prisma.workShift.create({ data: { code: 'HC-OFFICE', name: 'Hành chính (off T7+CN)', type: 'HANH_CHINH', startTime: '08:00', endTime: '17:00', workingDays: [1, 2, 3, 4, 5] } });
  const _worker = await prisma.workShift.findFirst({ where: { code: 'CN-WORKER' } });
  const worker = _worker
    ? await prisma.workShift.update({ where: { id: _worker.id }, data: { workingDays: [1, 2, 3, 4, 5, 6] } })
    : await prisma.workShift.create({ data: { code: 'CN-WORKER', name: 'Công nhân (off CN)', type: 'CA_SANG', startTime: '07:30', endTime: '16:30', workingDays: [1, 2, 3, 4, 5, 6] } });
  console.log(`   ✓ Ca: ${office.name} [T2-T6], ${worker.name} [T2-T7]`);

  // 2. Gán NV round-robin: chẵn→office, lẻ→worker (chỉ NV có userId + timesheet)
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, userId: { not: null } },
    select: { id: true, userId: true },
    orderBy: { code: 'asc' },
  });

  const holidays = await prisma.holidayCalendar.findMany({ select: { date: true } });
  const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

  const countStd = (start: Date, end: Date, wd: number[]) => {
    let n = 0;
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const fin = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    while (cur <= fin) {
      const key = cur.toISOString().slice(0, 10);
      if (!holidaySet.has(key) && wd.includes(isoWeekday(cur))) n++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return n;
  };

  let assigned = 0, tsUpdated = 0;
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const shift = i % 2 === 0 ? office : worker;
    const wd = shift.workingDays as number[];

    // ShiftAssignment (idempotent theo employee+shift)
    const existing = await prisma.shiftAssignment.findFirst({ where: { employeeId: emp.id } });
    if (!existing) {
      await prisma.shiftAssignment.create({
        data: { employeeId: emp.id, shiftId: shift.id, effectiveFrom: new Date(Date.UTC(2024, 0, 1)) },
      });
    } else if (existing.shiftId !== shift.id) {
      await prisma.shiftAssignment.update({ where: { id: existing.id }, data: { shiftId: shift.id } });
    }
    assigned++;

    // Tính lại standardDays cho mọi timesheet của user này
    const timesheets = await prisma.timesheetRecord.findMany({
      where: { userId: emp.userId! },
      select: { id: true, periodStart: true, periodEnd: true },
    });
    for (const ts of timesheets) {
      const std = countStd(ts.periodStart, ts.periodEnd, wd);
      await prisma.timesheetRecord.update({ where: { id: ts.id }, data: { standardDays: std } });
      tsUpdated++;
    }
  }

  console.log(`   ✓ Gán ca ${assigned} NV (xen kẽ office/công nhân)`);
  console.log(`   ✓ Cập nhật standardDays cho ${tsUpdated} bảng công`);
  console.log('\n✅ Hoàn tất. Office ≈22, Công nhân ≈26 (tuỳ tháng). Chạy lại generate payroll để áp dụng.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
