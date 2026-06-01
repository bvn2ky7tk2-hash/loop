/**
 * seed-payroll-full.ts
 * Seed dữ liệu payroll đầy đủ 3 kỳ (T3, T4, T5/2026) cho 500 nhân viên
 *
 * Chạy: npx tsx prisma/seed-payroll-full.ts
 *
 * Bao gồm:
 *  Step 1 — InsuranceConfig, TaxBracket, TaxDeductionConfig, HolidayCalendar 2026
 *  Step 2 — AttendanceRecord 3 tháng (T3, T4, T5) cho tất cả employee active
 *  Step 3 — MonthlyAttendance summarize
 *  Step 4 — TimesheetRecord từ MonthlyAttendance
 *  Step 5 — OvertimeRequest 50+ records
 *  Step 6 — LeaveRequest 60+ records
 *  Step 7 — PayrollPeriod 3 kỳ APPROVED + 1 kỳ T5 PROCESSING + tháng 13/2025
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rngFloat(min: number, max: number, decimals = 1): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Danh sách ngày nghỉ lễ 2026 (dạng YYYY-MM-DD string)
const HOLIDAY_DATES_2026 = new Set([
  '2026-01-01', // Tết dương lịch
  '2026-01-29', // Tết Nguyên Đán (29 tháng 12 âm)
  '2026-01-30', // Tết
  '2026-01-31', // Tết
  '2026-02-01', // Tết
  '2026-02-02', // Tết
  '2026-04-18', // Giỗ Tổ Hùng Vương
  '2026-04-30', // Giải phóng miền Nam
  '2026-05-01', // Quốc tế Lao Động
  '2026-09-02', // Quốc khánh
  '2026-09-03', // Quốc khánh (bù)
  '2026-12-25', // Giáng sinh
]);

function isHoliday(date: Date): boolean {
  const str = date.toISOString().slice(0, 10);
  return HOLIDAY_DATES_2026.has(str);
}

// Số ngày làm việc chuẩn trong tháng (không kể weekend, holiday)
function getStandardWorkDays(year: number, month: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (!isWeekend(date) && !isHoliday(date)) {
      count++;
    }
  }
  return count;
}

// ─── Step 1 — Config ──────────────────────────────────────────────────────────

async function seedConfig() {
  console.log('\n[Step 1] Seed InsuranceConfig, TaxBracket, TaxDeductionConfig, HolidayCalendar...');

  // InsuranceConfig 2026 — theo Nghị định 38/2022/NĐ-CP (lương tối thiểu vùng 2026)
  // Dùng $executeRaw để tránh lỗi Prisma với null tenantId trong composite unique
  await prisma.$executeRaw`
    INSERT INTO insurance_configs (
      id, tenant_id, effective_from,
      bhxh_employee_rate, bhyt_employee_rate, bhtn_employee_rate,
      bhxh_employer_rate, bhyt_employer_rate, bhtn_employer_rate,
      tnld_rate, bhxh_ceiling_multiple, wage_base,
      created_at
    ) VALUES (
      gen_random_uuid(), NULL, '2026-01-01'::date,
      0.08, 0.015, 0.01,
      0.175, 0.03, 0.01,
      0.005, 20, 2340000,
      now()
    )
    ON CONFLICT (tenant_id, effective_from) DO UPDATE SET
      bhxh_employee_rate = 0.08,
      bhyt_employee_rate = 0.015,
      bhtn_employee_rate = 0.01,
      bhxh_employer_rate = 0.175,
      bhyt_employer_rate = 0.03,
      bhtn_employer_rate = 0.01,
      tnld_rate = 0.005,
      bhxh_ceiling_multiple = 20,
      wage_base = 2340000
  `;
  console.log('  ✓ InsuranceConfig 2026');

  // TaxBracket 2025 — 7 bậc (Luật thuế TNCN hiện hành)
  const brackets2025 = JSON.stringify([
    { from: 0, to: 5000000, rate: 0.05 },
    { from: 5000000, to: 10000000, rate: 0.10 },
    { from: 10000000, to: 18000000, rate: 0.15 },
    { from: 18000000, to: 32000000, rate: 0.20 },
    { from: 32000000, to: 52000000, rate: 0.25 },
    { from: 52000000, to: 80000000, rate: 0.30 },
    { from: 80000000, to: null, rate: 0.35 },
  ]);
  await prisma.$executeRaw`
    INSERT INTO tax_brackets (id, tenant_id, name, effective_from, brackets, created_at)
    VALUES (gen_random_uuid(), NULL, 'Biểu thuế TNCN 2025 (7 bậc)', '2025-01-01'::date, ${brackets2025}::jsonb, now())
    ON CONFLICT (tenant_id, effective_from) DO NOTHING
  `;
  console.log('  ✓ TaxBracket 2025 (7 bậc)');

  // TaxBracket 2026 — 5 bậc (rút gọn theo dự thảo sửa đổi Luật thuế TNCN)
  const brackets2026 = JSON.stringify([
    { from: 0, to: 10000000, rate: 0.05 },
    { from: 10000000, to: 30000000, rate: 0.15 },
    { from: 30000000, to: 60000000, rate: 0.25 },
    { from: 60000000, to: 100000000, rate: 0.30 },
    { from: 100000000, to: null, rate: 0.35 },
  ]);
  await prisma.$executeRaw`
    INSERT INTO tax_brackets (id, tenant_id, name, effective_from, brackets, created_at)
    VALUES (gen_random_uuid(), NULL, 'Biểu thuế TNCN 2026 (5 bậc)', '2026-01-01'::date, ${brackets2026}::jsonb, now())
    ON CONFLICT (tenant_id, effective_from) DO NOTHING
  `;
  console.log('  ✓ TaxBracket 2026 (5 bậc, hiệu lực 01/01/2026)');

  // TaxDeductionConfig 2026 — theo Nghị quyết 954/2020/UBTVQH14
  await prisma.$executeRaw`
    INSERT INTO tax_deduction_configs (id, tenant_id, effective_from, self_deduction, dependent_deduction, created_at)
    VALUES (gen_random_uuid(), NULL, '2026-01-01'::date, 11000000, 4400000, now())
    ON CONFLICT (tenant_id, effective_from) DO UPDATE SET
      self_deduction = 11000000,
      dependent_deduction = 4400000
  `;
  console.log('  ✓ TaxDeductionConfig 2026 (bản thân: 11tr, phụ thuộc: 4.4tr)');

  // HolidayCalendar 2026
  const holidays2026 = [
    { date: new Date('2026-01-01'), name: 'Tết Dương lịch', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-01-29'), name: 'Tết Nguyên Đán (29 tháng Chạp)', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-01-30'), name: 'Tết Nguyên Đán (Mùng 1)', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-01-31'), name: 'Tết Nguyên Đán (Mùng 2)', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-02-01'), name: 'Tết Nguyên Đán (Mùng 3)', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-02-02'), name: 'Tết Nguyên Đán (Mùng 4)', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-04-18'), name: 'Giỗ Tổ Hùng Vương (10/3 âm lịch)', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-04-30'), name: 'Ngày Giải phóng miền Nam', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-05-01'), name: 'Quốc tế Lao Động', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-09-02'), name: 'Quốc khánh nước CHXHCN Việt Nam', type: 'NATIONAL_HOLIDAY' },
    { date: new Date('2026-09-03'), name: 'Quốc khánh (ngày nghỉ bù)', type: 'COMPENSATORY_DAY' },
    { date: new Date('2026-12-25'), name: 'Lễ Giáng sinh', type: 'COMPANY_HOLIDAY' },
  ];

  for (const h of holidays2026) {
    await prisma.$executeRaw`
      INSERT INTO holiday_calendars (id, date, name, type, year, created_at)
      VALUES (gen_random_uuid(), ${h.date}::date, ${h.name}, ${h.type}::"holiday_type", 2026, now())
      ON CONFLICT (date) DO NOTHING
    `;
  }
  console.log(`  ✓ HolidayCalendar 2026 (${holidays2026.length} ngày nghỉ lễ)`);
}

// ─── Step 2 — AttendanceRecord ────────────────────────────────────────────────

async function seedAttendance(employees: { id: string; tenantId: string | null }[]) {
  console.log('\n[Step 2] Seed AttendanceRecord 3 tháng (T3, T4, T5/2026)...');

  const months = [
    { year: 2026, month: 3 },
    { year: 2026, month: 4 },
    { year: 2026, month: 5 },
  ];

  let totalAttendance = 0;
  const BATCH = 50; // xử lý theo batch để tránh timeout

  for (const { year, month } of months) {
    const daysInMonth = new Date(year, month, 0).getDate();
    console.log(`  Tháng ${month}/${year} — ${daysInMonth} ngày, ${employees.length} nhân viên...`);

    for (let batchStart = 0; batchStart < employees.length; batchStart += BATCH) {
      const batch = employees.slice(batchStart, batchStart + BATCH);

      for (const emp of batch) {
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const dateStr = date.toISOString().slice(0, 10);
          const weekend = isWeekend(date);
          const holiday = isHoliday(date);

          let status: string;
          let lateMinutes = 0;
          let overtimeMinutes = 0;
          let checkIn: Date | null = null;
          let checkOut: Date | null = null;

          if (holiday) {
            // Ngày lễ — HOLIDAY, 5% OT
            status = 'HOLIDAY';
            if (Math.random() < 0.05) {
              status = 'OT';
              overtimeMinutes = rng(60, 240); // 1-4h OT
              // check-in/out cho OT ngày lễ
              const ci = new Date(date);
              ci.setHours(8, 0, 0, 0);
              checkIn = ci;
              const co = new Date(date);
              co.setHours(8 + Math.floor(overtimeMinutes / 60), overtimeMinutes % 60, 0, 0);
              checkOut = co;
            }
          } else if (weekend) {
            // Weekend — không tính, bỏ qua (không tạo record)
            continue;
          } else {
            // Ngày làm việc: 95% PRESENT, 3% LEAVE, 1% ABSENT, 1% HOLIDAY (bù)
            const roll = Math.random();
            if (roll < 0.95) {
              status = 'PRESENT';
              // 10% ngày đi trễ 0-30 phút
              if (Math.random() < 0.10) {
                lateMinutes = rng(5, 30);
              }
              // 15% ngày OT weekday 1-4h
              if (Math.random() < 0.15) {
                overtimeMinutes = rng(60, 240);
              }
              // Check-in/out
              const ci = new Date(date);
              ci.setHours(8, lateMinutes, 0, 0);
              checkIn = ci;
              const co = new Date(date);
              const baseWorkMinutes = 9 * 60 - 60; // 8 giờ làm (9h - 1h nghỉ trưa)
              co.setMinutes(co.getMinutes() + 8 * 60 + lateMinutes + overtimeMinutes);
              co.setHours(17 + Math.floor((lateMinutes + overtimeMinutes) / 60), (lateMinutes + overtimeMinutes) % 60, 0, 0);
              checkOut = co;
            } else if (roll < 0.98) {
              status = 'LEAVE';
            } else if (roll < 0.99) {
              status = 'ABSENT';
            } else {
              status = 'HOLIDAY';
            }
          }

          // Tính totalHours
          let totalHours: number | null = null;
          if (checkIn && checkOut) {
            totalHours = parseFloat(((checkOut.getTime() - checkIn.getTime()) / 3600000).toFixed(2));
          }

          try {
            await prisma.$executeRaw`
              INSERT INTO attendance_records (
                id, employee_id, date, check_in, check_out,
                status, late_minutes, overtime_minutes,
                total_hours, is_manual, created_at, updated_at
              ) VALUES (
                gen_random_uuid(), ${emp.id}, ${date}::date,
                ${checkIn}::timestamptz, ${checkOut}::timestamptz,
                ${status}::"attendance_status",
                ${lateMinutes}, ${overtimeMinutes},
                ${totalHours}::numeric, false, now(), now()
              )
              ON CONFLICT (employee_id, date) DO NOTHING
            `;
            totalAttendance++;
          } catch {
            // Bỏ qua conflict
          }
        }
      }

      if (batchStart % 200 === 0) {
        process.stdout.write(`    Đã xử lý ${Math.min(batchStart + BATCH, employees.length)}/${employees.length}...\r`);
      }
    }
    console.log(`  ✓ Tháng ${month}/${year} hoàn thành`);
  }

  console.log(`  Tổng AttendanceRecord tạo: ~${totalAttendance}`);
  return totalAttendance;
}

// ─── Step 3 — MonthlyAttendance ───────────────────────────────────────────────

async function seedMonthlyAttendance(employees: { id: string }[]) {
  console.log('\n[Step 3] Summarize MonthlyAttendance T3, T4, T5/2026...');

  const months = [
    { year: 2026, month: 3 },
    { year: 2026, month: 4 },
    { year: 2026, month: 5 },
  ];

  let totalMonthly = 0;

  for (const { year, month } of months) {
    const standardDays = getStandardWorkDays(year, month);

    for (const emp of employees) {
      // Tổng hợp từ attendance_records
      const records = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: new Date(year, month - 1, 1),
            lte: new Date(year, month - 1, new Date(year, month, 0).getDate()),
          },
        },
        select: { status: true, overtimeMinutes: true },
      });

      let workDays = 0;
      let absentDays = 0;
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let holidayDays = 0;
      let otMinutes = 0;

      for (const r of records) {
        if (r.status === 'PRESENT' || r.status === 'OT') {
          workDays += 1;
          otMinutes += r.overtimeMinutes || 0;
        } else if (r.status === 'ABSENT') {
          absentDays += 1;
        } else if (r.status === 'LEAVE') {
          paidLeaveDays += 1;
        } else if (r.status === 'HOLIDAY') {
          holidayDays += 1;
        }
      }

      const otHours = parseFloat((otMinutes / 60).toFixed(2));

      try {
        const existing = await prisma.monthlyAttendance.findFirst({
          where: { employeeId: emp.id, year, month },
        });

        if (!existing) {
          const ma = await prisma.monthlyAttendance.create({
            data: {
              employeeId: emp.id,
              year,
              month,
              workDays,
              paidLeaveDays,
              unpaidLeaveDays,
              otHours,
              absentDays,
              holidayDays,
              status: month < 5 ? 'APPROVED' : 'LOCKED',
            },
          });

          // Liên kết attendance records vào monthly attendance
          await prisma.attendanceRecord.updateMany({
            where: {
              employeeId: emp.id,
              date: {
                gte: new Date(year, month - 1, 1),
                lte: new Date(year, month - 1, new Date(year, month, 0).getDate()),
              },
              monthlyAttendanceId: null,
            },
            data: { monthlyAttendanceId: ma.id },
          });

          totalMonthly++;
        }
      } catch {
        // Bỏ qua
      }
    }
    console.log(`  ✓ MonthlyAttendance tháng ${month}/${year}: ${employees.length} records`);
  }

  console.log(`  Tổng MonthlyAttendance: ${totalMonthly}`);
  return totalMonthly;
}

// ─── Step 4 — TimesheetRecord ─────────────────────────────────────────────────

async function seedTimesheets(employees: { id: string; userId: string | null }[], adminUserId: string) {
  console.log('\n[Step 4] Tạo TimesheetRecord từ MonthlyAttendance...');

  const periods = [
    { year: 2026, month: 3, start: new Date('2026-03-01'), end: new Date('2026-03-31') },
    { year: 2026, month: 4, start: new Date('2026-04-01'), end: new Date('2026-04-30') },
    { year: 2026, month: 5, start: new Date('2026-05-01'), end: new Date('2026-05-31') },
  ];

  let total = 0;

  for (const period of periods) {
    const standardDays = getStandardWorkDays(period.year, period.month);
    const isApproved = period.month < 5;

    for (const emp of employees) {
      if (!emp.userId) continue;

      const ma = await prisma.monthlyAttendance.findFirst({
        where: { employeeId: emp.id, year: period.year, month: period.month },
      });
      if (!ma) continue;

      const existing = await prisma.timesheetRecord.findFirst({
        where: { userId: emp.userId, periodStart: period.start },
      });
      if (existing) continue;

      const otWeekdayHours = parseFloat((Number(ma.otHours) * 0.7).toFixed(2));
      const otWeekendHours = parseFloat((Number(ma.otHours) * 0.25).toFixed(2));
      const otHolidayHours = parseFloat((Number(ma.otHours) * 0.05).toFixed(2));

      await prisma.timesheetRecord.create({
        data: {
          userId: emp.userId,
          periodStart: period.start,
          periodEnd: period.end,
          workingDays: Number(ma.workDays),
          standardDays,
          overtimeHours: Number(ma.otHours),
          otWeekdayHours,
          otWeekendHours,
          otHolidayHours,
          leaveDays: Number(ma.paidLeaveDays),
          unpaidLeaveDays: Number(ma.unpaidLeaveDays),
          status: isApproved ? 'APPROVED' : 'SUBMITTED',
          submittedAt: new Date(period.year, period.month - 1, 28),
          ...(isApproved
            ? {
                approvedAt: new Date(period.year, period.month - 1, 30),
                approvedById: adminUserId,
                lockedAt: new Date(period.year, period.month - 1, 30),
              }
            : {}),
        },
      });
      total++;
    }
    console.log(`  ✓ Timesheet tháng ${period.month}/${period.year}: ${total} records (tích lũy)`);
  }

  console.log(`  Tổng TimesheetRecord: ${total}`);
  return total;
}

// ─── Step 5 — OvertimeRequest ─────────────────────────────────────────────────

async function seedOvertimeRequests(
  employees: { id: string }[],
  adminUserId: string,
) {
  console.log('\n[Step 5] Tạo OvertimeRequest 50+ records...');

  const reasons = [
    'Hoàn thành sprint deadline Q1',
    'Demo khách hàng quan trọng',
    'Fix hotfix production khẩn',
    'Chuẩn bị báo cáo tháng',
    'Hỗ trợ go-live module mới',
    'Code review trước release',
    'Tích hợp API đối tác',
    'Backup dữ liệu cuối tháng',
    'Test hồi quy trước UAT',
    'Onboarding khách hàng mới',
  ];

  const otDates = [
    // T3/2026
    { date: new Date('2026-03-05'), dayType: 'WEEKDAY' },
    { date: new Date('2026-03-07'), dayType: 'WEEKEND' },
    { date: new Date('2026-03-10'), dayType: 'WEEKDAY' },
    { date: new Date('2026-03-14'), dayType: 'WEEKEND' },
    { date: new Date('2026-03-17'), dayType: 'WEEKDAY' },
    { date: new Date('2026-03-20'), dayType: 'WEEKDAY' },
    { date: new Date('2026-03-24'), dayType: 'WEEKDAY' },
    { date: new Date('2026-03-27'), dayType: 'WEEKDAY' },
    { date: new Date('2026-03-28'), dayType: 'WEEKEND' },
    { date: new Date('2026-03-31'), dayType: 'WEEKDAY' },
    // T4/2026
    { date: new Date('2026-04-02'), dayType: 'WEEKDAY' },
    { date: new Date('2026-04-04'), dayType: 'WEEKEND' },
    { date: new Date('2026-04-07'), dayType: 'WEEKDAY' },
    { date: new Date('2026-04-11'), dayType: 'WEEKEND' },
    { date: new Date('2026-04-14'), dayType: 'WEEKDAY' },
    { date: new Date('2026-04-17'), dayType: 'WEEKDAY' },
    { date: new Date('2026-04-18'), dayType: 'HOLIDAY' },
    { date: new Date('2026-04-21'), dayType: 'WEEKDAY' },
    { date: new Date('2026-04-25'), dayType: 'WEEKEND' },
    { date: new Date('2026-04-28'), dayType: 'WEEKDAY' },
    { date: new Date('2026-04-30'), dayType: 'HOLIDAY' },
    // T5/2026
    { date: new Date('2026-05-01'), dayType: 'HOLIDAY' },
    { date: new Date('2026-05-05'), dayType: 'WEEKDAY' },
    { date: new Date('2026-05-09'), dayType: 'WEEKEND' },
    { date: new Date('2026-05-12'), dayType: 'WEEKDAY' },
    { date: new Date('2026-05-16'), dayType: 'WEEKEND' },
    { date: new Date('2026-05-19'), dayType: 'WEEKDAY' },
    { date: new Date('2026-05-22'), dayType: 'WEEKDAY' },
    { date: new Date('2026-05-26'), dayType: 'WEEKDAY' },
    { date: new Date('2026-05-29'), dayType: 'WEEKDAY' },
  ];

  // Lấy tối đa 60 nhân viên để tạo OT
  const otEmployees = employees.slice(0, 60);
  let total = 0;

  for (let i = 0; i < otDates.length && i < otEmployees.length; i++) {
    const { date, dayType } = otDates[i % otDates.length];
    const emp = otEmployees[i % otEmployees.length];
    const hours = dayType === 'WEEKEND' ? rngFloat(2, 8) : rngFloat(1, 4);
    const isApproved = i < 40; // 40 APPROVED, còn lại PENDING
    const reason = reasons[i % reasons.length];

    try {
      // day_type chưa có trong DB, bỏ column này khỏi INSERT
      await prisma.$executeRaw`
        INSERT INTO overtime_requests (
          id, employee_id, date, hours, reason, status,
          approved_by_id, approved_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${emp.id}, ${date}::date, ${hours},
          ${reason},
          ${isApproved ? 'APPROVED' : 'PENDING'}::"ot_status",
          ${isApproved ? adminUserId : null},
          ${isApproved ? new Date() : null}::timestamptz,
          now(), now()
        )
        ON CONFLICT (employee_id, date) DO NOTHING
      `;
      total++;
    } catch {
      // Bỏ qua
    }
  }

  // Thêm thêm 25 OT records với nhân viên khác
  for (let extra = 0; extra < 25; extra++) {
    const emp = employees[rng(0, Math.min(99, employees.length - 1))];
    const dateBase = new Date('2026-03-01');
    const offset = rng(0, 90); // 3 tháng
    const date = addDays(dateBase, offset);
    if (isWeekend(date) || isHoliday(date)) continue;

    const hours = rngFloat(1, 3);
    const isApproved = Math.random() < 0.6;

    try {
      await prisma.$executeRaw`
        INSERT INTO overtime_requests (
          id, employee_id, date, hours, reason, status,
          approved_by_id, approved_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${emp.id}, ${date}::date, ${hours},
          'Làm thêm giờ theo yêu cầu dự án',
          ${isApproved ? 'APPROVED' : 'PENDING'}::"ot_status",
          ${isApproved ? adminUserId : null},
          ${isApproved ? new Date() : null}::timestamptz,
          now(), now()
        )
        ON CONFLICT (employee_id, date) DO NOTHING
      `;
      total++;
    } catch {
      // Bỏ qua
    }
  }

  console.log(`  ✓ Tổng OvertimeRequest: ${total} records (mix APPROVED/PENDING)`);
  return total;
}

// ─── Step 6 — LeaveRequest ────────────────────────────────────────────────────

async function seedLeaveRequests(
  employees: { id: string; tenantId: string | null }[],
  adminUserId: string,
) {
  console.log('\n[Step 6] Tạo LeaveRequest 60+ records...');

  // Đảm bảo có LeaveType — dùng $executeRaw vì schema mới hơn DB (annual_days/max_carry_over chưa migrate)
  await prisma.$executeRaw`
    INSERT INTO leave_types (id, name, max_days_per_year, is_paid, color, is_active, created_at)
    VALUES
      (gen_random_uuid(), 'Nghỉ phép năm', 12, true, '#2563EB', true, now()),
      (gen_random_uuid(), 'Nghỉ không lương', 30, false, '#94A3B8', true, now()),
      (gen_random_uuid(), 'Nghỉ ốm', 30, true, '#F59E0B', true, now())
    ON CONFLICT (name) DO NOTHING
  `;

  // Dùng $queryRaw thay vì findFirst vì Prisma generated model include fields chưa migrate (annual_days)
  type LeaveTypeRow = { id: string; name: string; is_paid: boolean; is_active: boolean };
  const leaveTypeRows = await prisma.$queryRaw<LeaveTypeRow[]>`
    SELECT id, name, is_paid, is_active FROM leave_types WHERE is_active = true ORDER BY created_at
  `;

  const annualLeaveRow = leaveTypeRows.find(r => r.name === 'Nghỉ phép năm') ?? leaveTypeRows.find(r => r.is_paid);
  if (!annualLeaveRow) throw new Error('Không tìm thấy LeaveType paid');
  const annualLeave = { id: annualLeaveRow.id };

  const unpaidLeaveRow = leaveTypeRows.find(r => !r.is_paid);
  if (!unpaidLeaveRow) throw new Error('Không tìm thấy LeaveType unpaid');
  const unpaidLeave = { id: unpaidLeaveRow.id };

  const sickLeaveRow = leaveTypeRows.find(r => r.name === 'Nghỉ ốm') ?? leaveTypeRows.find(r => r.is_paid);
  if (!sickLeaveRow) throw new Error('Không tìm thấy LeaveType sick');
  const sickLeave = { id: sickLeaveRow.id };

  const leaveDates = [
    // T3/2026
    { start: new Date('2026-03-02'), end: new Date('2026-03-02'), days: 1, typeId: annualLeave.id, status: 'APPROVED' },
    { start: new Date('2026-03-09'), end: new Date('2026-03-10'), days: 2, typeId: annualLeave.id, status: 'APPROVED' },
    { start: new Date('2026-03-16'), end: new Date('2026-03-16'), days: 1, typeId: sickLeave.id, status: 'APPROVED' },
    { start: new Date('2026-03-23'), end: new Date('2026-03-23'), days: 1, typeId: unpaidLeave.id, status: 'APPROVED' },
    { start: new Date('2026-03-25'), end: new Date('2026-03-26'), days: 2, typeId: annualLeave.id, status: 'APPROVED' },
    // T4/2026
    { start: new Date('2026-04-01'), end: new Date('2026-04-01'), days: 1, typeId: annualLeave.id, status: 'APPROVED' },
    { start: new Date('2026-04-06'), end: new Date('2026-04-07'), days: 2, typeId: sickLeave.id, status: 'APPROVED' },
    { start: new Date('2026-04-13'), end: new Date('2026-04-13'), days: 1, typeId: annualLeave.id, status: 'APPROVED' },
    { start: new Date('2026-04-20'), end: new Date('2026-04-22'), days: 3, typeId: annualLeave.id, status: 'APPROVED' },
    { start: new Date('2026-04-27'), end: new Date('2026-04-27'), days: 1, typeId: unpaidLeave.id, status: 'REJECTED' },
    // T5/2026
    { start: new Date('2026-05-04'), end: new Date('2026-05-04'), days: 1, typeId: annualLeave.id, status: 'PENDING' },
    { start: new Date('2026-05-06'), end: new Date('2026-05-07'), days: 2, typeId: sickLeave.id, status: 'APPROVED' },
    { start: new Date('2026-05-11'), end: new Date('2026-05-11'), days: 1, typeId: annualLeave.id, status: 'APPROVED' },
    { start: new Date('2026-05-15'), end: new Date('2026-05-15'), days: 1, typeId: unpaidLeave.id, status: 'APPROVED' },
    { start: new Date('2026-05-18'), end: new Date('2026-05-19'), days: 2, typeId: annualLeave.id, status: 'PENDING' },
    { start: new Date('2026-05-25'), end: new Date('2026-05-25'), days: 1, typeId: sickLeave.id, status: 'PENDING' },
    { start: new Date('2026-05-28'), end: new Date('2026-05-29'), days: 2, typeId: annualLeave.id, status: 'APPROVED' },
  ];

  let total = 0;
  const leaveEmployees = employees.slice(0, 70);

  for (let i = 0; i < leaveDates.length; i++) {
    const ld = leaveDates[i % leaveDates.length];
    const emp = leaveEmployees[i % leaveEmployees.length];

    const existing = await prisma.leaveRequest.findFirst({
      where: { employeeId: emp.id, startDate: ld.start, leaveTypeId: ld.typeId },
    });
    if (existing) continue;

    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: ld.typeId,
        startDate: ld.start,
        endDate: ld.end,
        days: ld.days,
        reason: 'Nghỉ theo kế hoạch',
        status: ld.status as any,
        ...(ld.status === 'APPROVED'
          ? {
              approvedById: adminUserId,
              approvedAt: new Date(ld.start.getTime() - 86400000),
            }
          : {}),
        ...(ld.status === 'REJECTED'
          ? {
              approvedById: adminUserId,
              approvedAt: new Date(ld.start.getTime() - 86400000),
              rejectedReason: 'Không đủ số ngày phép còn lại',
            }
          : {}),
        ...(emp.tenantId ? { tenantId: emp.tenantId } : {}),
      },
    });
    total++;
  }

  // Thêm 45 LeaveRequest random
  for (let extra = 0; extra < 45; extra++) {
    const emp = employees[rng(0, Math.min(149, employees.length - 1))];
    const monthOffset = rng(0, 2); // T3, T4, T5
    const baseDate = new Date(2026, 2 + monthOffset, rng(1, 25));
    if (isWeekend(baseDate)) continue;

    const leaveType = [annualLeave, unpaidLeave, sickLeave][rng(0, 2)];
    const days = rng(1, 3);
    const statusRoll = Math.random();
    const status = statusRoll < 0.65 ? 'APPROVED' : statusRoll < 0.85 ? 'PENDING' : 'REJECTED';

    const existing = await prisma.leaveRequest.findFirst({
      where: { employeeId: emp.id, startDate: baseDate, leaveTypeId: leaveType.id },
    });
    if (existing) continue;

    try {
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveTypeId: leaveType.id,
          startDate: baseDate,
          endDate: addDays(baseDate, days - 1),
          days,
          reason: 'Việc cá nhân',
          status: status as any,
          ...(status === 'APPROVED' ? { approvedById: adminUserId, approvedAt: new Date() } : {}),
          ...(status === 'REJECTED' ? {
            approvedById: adminUserId,
            approvedAt: new Date(),
            rejectedReason: 'Hết phép năm',
          } : {}),
          ...(emp.tenantId ? { tenantId: emp.tenantId } : {}),
        },
      });
      total++;
    } catch {
      // Bỏ qua
    }
  }

  console.log(`  ✓ Tổng LeaveRequest: ${total} records (mix APPROVED/PENDING/REJECTED)`);
  return total;
}

// ─── Step 7 — PayrollPeriod + PayrollRecord ───────────────────────────────────

async function seedPayrollPeriods(
  employees: { id: string; tenantId: string | null }[],
  adminUserId: string,
) {
  console.log('\n[Step 7] Tạo PayrollPeriod + PayrollRecord...');

  // Đọc InsuranceConfig — dùng $queryRaw vì generated model có field chưa migrate
  type InsuranceRow = {
    bhxh_employee_rate: string; bhyt_employee_rate: string; bhtn_employee_rate: string;
    bhxh_employer_rate: string; bhyt_employer_rate: string; bhtn_employer_rate: string;
    tnld_rate: string; bhxh_ceiling_multiple: number; wage_base: string;
  };
  const insRows = await prisma.$queryRaw<InsuranceRow[]>`
    SELECT bhxh_employee_rate, bhyt_employee_rate, bhtn_employee_rate,
           bhxh_employer_rate, bhyt_employer_rate, bhtn_employer_rate,
           tnld_rate, bhxh_ceiling_multiple, wage_base
    FROM insurance_configs
    WHERE effective_from = '2026-01-01'::date
    LIMIT 1
  `;
  const insConfig = insRows[0] ?? null;
  const wageBase = insConfig ? Number(insConfig.wage_base) : 2340000;
  const bhxhCeiling = wageBase * (insConfig ? insConfig.bhxh_ceiling_multiple : 20);

  // Đọc TaxDeductionConfig — dùng $queryRaw
  type TaxDeductionRow = { self_deduction: string; dependent_deduction: string };
  const taxRows = await prisma.$queryRaw<TaxDeductionRow[]>`
    SELECT self_deduction, dependent_deduction
    FROM tax_deduction_configs
    WHERE effective_from = '2026-01-01'::date
    LIMIT 1
  `;
  const taxDeduction = taxRows[0] ?? null;
  const selfDeduction = taxDeduction ? Number(taxDeduction.self_deduction) : 11000000;

  // Helper tính PIT theo biểu thuế 5 bậc 2026
  function calcPit(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;
    const brackets = [
      { limit: 10000000, rate: 0.05 },
      { limit: 30000000, rate: 0.15 },
      { limit: 60000000, rate: 0.25 },
      { limit: 100000000, rate: 0.30 },
      { limit: Infinity, rate: 0.35 },
    ];
    let tax = 0;
    let prev = 0;
    for (const b of brackets) {
      if (taxableIncome <= prev) break;
      const chunk = Math.min(taxableIncome, b.limit) - prev;
      tax += chunk * b.rate;
      prev = b.limit;
    }
    return Math.max(0, tax);
  }

  // Helper tính lương cho 1 nhân viên
  function calcPayroll(
    baseSalary: number,
    workDays: number,
    standardDays: number,
    paidLeaveDays: number,
    unpaidLeaveDays: number,
    otHours: number,
    allowances: number,
    dependents: number,
  ) {
    const effectiveDays = workDays + paidLeaveDays;
    const actualSalary = effectiveDays > 0 ? (baseSalary * effectiveDays) / standardDays : baseSalary;

    // OT pay: weekday 150%, weekend 200%, holiday 300% — tính đơn giản theo avg
    const hourlyRate = baseSalary / (standardDays * 8);
    const otPay = otHours * hourlyRate * 1.5;

    const grossSalary = actualSalary + otPay + allowances;

    // BHXH, BHYT, BHTN (NLĐ) — trần BHXH = bhxhCeiling
    const insuranceBasis = Math.min(grossSalary, bhxhCeiling);
    // insConfig là raw row từ $queryRaw, dùng snake_case field names
    const bhxhEmployee = insuranceBasis * (insConfig ? Number(insConfig.bhxh_employee_rate) : 0.08);
    const bhytEmployee = insuranceBasis * (insConfig ? Number(insConfig.bhyt_employee_rate) : 0.015);
    const bhtnEmployee = insuranceBasis * (insConfig ? Number(insConfig.bhtn_employee_rate) : 0.01);

    // NSDLĐ
    const bhxhEmployer = insuranceBasis * (insConfig ? Number(insConfig.bhxh_employer_rate) : 0.175);
    const bhytEmployer = insuranceBasis * (insConfig ? Number(insConfig.bhyt_employer_rate) : 0.03);
    const bhtnEmployer = insuranceBasis * (insConfig ? Number(insConfig.bhtn_employer_rate) : 0.01);
    const tnldEmployer = insuranceBasis * (insConfig ? Number(insConfig.tnld_rate) : 0.005);

    const totalInsuranceEmployee = bhxhEmployee + bhytEmployee + bhtnEmployee;

    // Thu nhập tính thuế
    const dependentDeduction = dependents * (taxDeduction ? Number(taxDeduction.dependent_deduction) : 4400000);
    const taxableIncome = Math.max(
      0,
      grossSalary - totalInsuranceEmployee - selfDeduction - dependentDeduction,
    );

    const pitAmount = calcPit(taxableIncome);
    const unpaidDeduction = unpaidLeaveDays > 0 ? (baseSalary * unpaidLeaveDays) / standardDays : 0;
    const netSalary = grossSalary - totalInsuranceEmployee - pitAmount - unpaidDeduction;
    const totalLaborCost = grossSalary + bhxhEmployer + bhytEmployer + bhtnEmployer + tnldEmployer;

    return {
      grossSalary: Math.round(grossSalary),
      baseSalary: Math.round(baseSalary),
      overtimePay: Math.round(otPay),
      allowances: Math.round(allowances),
      deductions: Math.round(unpaidDeduction),
      bhxhEmployee: Math.round(bhxhEmployee),
      bhytEmployee: Math.round(bhytEmployee),
      bhtnEmployee: Math.round(bhtnEmployee),
      bhxhEmployer: Math.round(bhxhEmployer),
      bhytEmployer: Math.round(bhytEmployer),
      bhtnEmployer: Math.round(bhtnEmployer),
      tnldEmployer: Math.round(tnldEmployer),
      taxableIncome: Math.round(taxableIncome),
      selfDeduction: Math.round(selfDeduction),
      dependentDeduction: Math.round(dependentDeduction),
      dependentCount: dependents,
      pitAmount: Math.round(pitAmount),
      netSalary: Math.round(netSalary),
      totalLaborCost: Math.round(totalLaborCost),
    };
  }

  const periods = [
    {
      name: 'Tháng 13/2025 (Thưởng cuối năm)',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'PAID',
      type: 'ADJUSTMENT', // MONTH_13 chưa có trong DB enum, dùng ADJUSTMENT để thay thế
      processedAt: new Date('2026-02-10'),
    },
    {
      name: 'Lương tháng 3/2026',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
      status: 'PAID',
      type: 'REGULAR',
      processedAt: new Date('2026-04-05'),
    },
    {
      name: 'Lương tháng 4/2026',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-30'),
      status: 'PAID',
      type: 'REGULAR',
      processedAt: new Date('2026-05-05'),
    },
    {
      name: 'Lương tháng 5/2026',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
      status: 'PROCESSING',
      type: 'REGULAR',
      processedAt: null,
    },
  ];

  let totalPeriods = 0;
  let totalRecords = 0;

  for (const p of periods) {
    // Tìm hoặc tạo PayrollPeriod — dùng $queryRaw vì tenant_id chưa có trong DB
    const periodRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM payroll_periods WHERE name = ${p.name} LIMIT 1
    `;
    let periodId: string;
    if (periodRows.length > 0) {
      periodId = periodRows[0].id;
    } else {
      const newPeriodRows = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO payroll_periods (id, name, start_date, end_date, status, type, processed_by_id, processed_at, created_at, updated_at)
        VALUES (
          gen_random_uuid(), ${p.name}, ${p.startDate}::date, ${p.endDate}::date,
          ${p.status}::"payroll_status", ${p.type}::"payroll_period_type",
          ${adminUserId}, ${p.processedAt}::timestamptz, now(), now()
        )
        RETURNING id
      `;
      periodId = newPeriodRows[0].id;
    }
    const period = { id: periodId };
    totalPeriods++;
    console.log(`  Kỳ lương: ${p.name} (${p.status})`);

    const isMonth13 = p.type === 'MONTH_13';
    const standardDays = isMonth13 ? 22 : getStandardWorkDays(
      p.startDate.getFullYear(),
      p.startDate.getMonth() + 1,
    );

    // Tạo PayrollRecord cho từng nhân viên
    const BATCH = 50;
    for (let batchStart = 0; batchStart < employees.length; batchStart += BATCH) {
      const batch = employees.slice(batchStart, batchStart + BATCH);

      const records = await Promise.all(
        batch.map(async (emp) => {
          // Kiểm tra đã tồn tại chưa
          const existingRows = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM payroll_records WHERE period_id = ${period.id} AND employee_id = ${emp.id} LIMIT 1
          `;
          if (existingRows.length > 0) return null;

          // Lấy monthly attendance
          const ma = isMonth13
            ? null
            : await prisma.monthlyAttendance.findFirst({
                where: {
                  employeeId: emp.id,
                  year: p.startDate.getFullYear(),
                  month: p.startDate.getMonth() + 1,
                },
              });

          // Lấy lương cơ bản từ contract — dùng select để tránh lỗi field chưa migrate
          const contract = await prisma.contract.findFirst({
            where: { employeeId: emp.id, status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            select: { salaryMonthly: true },
          });
          const baseSalaryMonthly = contract
            ? Number(contract.salaryMonthly)
            : rng(10, 50) * 1000000;

          const workDays = ma ? Number(ma.workDays) : standardDays;
          const paidLeaveDays = ma ? Number(ma.paidLeaveDays) : 0;
          const unpaidLeaveDays = ma ? Number(ma.unpaidLeaveDays) : 0;
          const otHours = ma ? Number(ma.otHours) : 0;
          const allowances = rng(500, 3000) * 1000; // 500k - 3tr phụ cấp
          const dependents = Math.random() < 0.4 ? rng(1, 3) : 0;

          // Tháng 13: thưởng = 1 tháng lương
          if (isMonth13) {
            const gross = Math.round(baseSalaryMonthly * 0.8); // 80% lương tháng 13 sau tính thuế đơn giản
            return {
              periodId: period.id,
              employeeId: emp.id,
              workDays: 0,
              leaveDays: 0,
              paidLeaveDays: 0,
              unpaidLeaveDays: 0,
              overtimeHours: 0,
              baseSalary: baseSalaryMonthly,
              grossSalary: baseSalaryMonthly,
              overtimePay: 0,
              allowances: 0,
              deductions: 0,
              bonus: baseSalaryMonthly,
              bhxhEmployee: 0,
              bhytEmployee: 0,
              bhtnEmployee: 0,
              bhxhEmployer: 0,
              bhytEmployer: 0,
              bhtnEmployer: 0,
              tnldEmployer: 0,
              taxableIncome: baseSalaryMonthly,
              selfDeduction,
              dependentDeduction: 0,
              dependentCount: 0,
              pitAmount: Math.round(calcPit(Math.max(0, baseSalaryMonthly - selfDeduction))),
              totalLaborCost: baseSalaryMonthly,
              netSalary: gross,
              // Không thêm tenantId vì payroll_records chưa có cột này trong DB
            };
          }

          const calc = calcPayroll(
            baseSalaryMonthly,
            workDays,
            standardDays,
            paidLeaveDays,
            unpaidLeaveDays,
            otHours,
            allowances,
            dependents,
          );

          return {
            periodId: period.id,
            employeeId: emp.id,
            workDays,
            leaveDays: paidLeaveDays + unpaidLeaveDays,
            paidLeaveDays,
            unpaidLeaveDays,
            overtimeHours: otHours,
            ...calc,
            // Không thêm tenantId vì payroll_records chưa có cột này trong DB
          };
        }),
      );

      const validRecords = records.filter((r): r is NonNullable<typeof r> => r !== null);
      if (validRecords.length > 0) {
        await prisma.payrollRecord.createMany({ data: validRecords, skipDuplicates: true });
        totalRecords += validRecords.length;
      }
    }

    console.log(`    ✓ PayrollRecord: ${totalRecords} (tích lũy)`);
  }

  console.log(`  Tổng PayrollPeriod: ${totalPeriods}, PayrollRecord: ${totalRecords}`);
  return { totalPeriods, totalRecords };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SEED PAYROLL FULL (3 kỳ) ===');
  console.log('Ngày chạy:', new Date().toLocaleDateString('vi-VN'));

  // Lấy admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });
  if (!adminUser) {
    console.error('Không tìm thấy user ADMIN. Hãy chạy seed.ts trước.');
    process.exit(1);
  }
  const adminUserId = adminUser.id;
  console.log(`Admin user: ${adminUserId}`);

  // Lấy danh sách nhân viên active
  const employees = await prisma.employee.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, tenantId: true, userId: true },
    take: 500,
    orderBy: { createdAt: 'asc' },
  });

  if (employees.length === 0) {
    console.error('Không tìm thấy nhân viên active. Hãy chạy seed-500.js trước.');
    process.exit(1);
  }
  console.log(`Tổng nhân viên active: ${employees.length}`);

  // Step 1
  await seedConfig();

  // Step 2
  const totalAttendance = await seedAttendance(employees);

  // Step 3
  const totalMonthly = await seedMonthlyAttendance(employees);

  // Step 4
  const totalTimesheet = await seedTimesheets(employees, adminUserId);

  // Step 5
  const totalOT = await seedOvertimeRequests(employees, adminUserId);

  // Step 6
  const totalLeave = await seedLeaveRequests(employees, adminUserId);

  // Step 7
  const { totalPeriods, totalRecords } = await seedPayrollPeriods(employees, adminUserId);

  // Report
  console.log('\n=== KẾT QUẢ SEED ===');
  console.log(`Nhân viên: ${employees.length}`);
  console.log(`AttendanceRecord (3 tháng): ~${totalAttendance}`);
  console.log(`MonthlyAttendance: ${totalMonthly}`);
  console.log(`TimesheetRecord: ${totalTimesheet}`);
  console.log(`OvertimeRequest: ${totalOT}`);
  console.log(`LeaveRequest: ${totalLeave}`);
  console.log(`PayrollPeriod: ${totalPeriods} kỳ`);
  console.log(`PayrollRecord: ${totalRecords}`);
  console.log('\nSeed payroll-full hoàn thành!');
}

main()
  .catch((e) => {
    console.error('Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
