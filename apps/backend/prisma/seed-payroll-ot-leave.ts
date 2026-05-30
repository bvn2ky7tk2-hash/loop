/**
 * Seed: OvertimeRequest + LeaveRequest cho Epic E16 (OT & Leave → Payroll Integration)
 *
 * Chạy SAU KHI đã có data nhân viên và kỳ lương trong DB:
 *   npm run seed:payroll-ot-leave
 *
 * Dữ liệu tạo:
 *  - 5 OvertimeRequest APPROVED cho nhân viên đầu tiên tìm được:
 *      3 WEEKDAY, 1 WEEKEND, 1 HOLIDAY
 *  - 2 OvertimeRequest PENDING (không được tính vào payroll)
 *  - 2 LeaveRequest APPROVED với LeaveType.isPaid = false
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Lấy nhân viên đầu tiên active
  const employee = await prisma.employee.findFirst({
    where: { isActive: true },
    select: { id: true, tenantId: true },
  });

  if (!employee) {
    console.error('Không tìm thấy nhân viên active. Hãy seed employee data trước.');
    process.exit(1);
  }

  console.log(`Seeding OT + Leave cho employee: ${employee.id}`);

  // Kỳ lương tháng hiện tại (dùng tháng 5/2026 — ngày chạy seed)
  const periodStart = new Date('2026-05-01');
  const periodEnd = new Date('2026-05-31');

  // ─── 5 OvertimeRequest APPROVED ────────────────────────────────────────────

  const approvedOtData = [
    // 3 WEEKDAY
    {
      date: new Date('2026-05-05'), // Thứ 2
      hours: 2.5,
      dayType: 'WEEKDAY',
      reason: 'Hoàn thành sprint deadline Q2',
    },
    {
      date: new Date('2026-05-12'), // Thứ 2
      hours: 3.0,
      dayType: 'WEEKDAY',
      reason: 'Demo khách hàng',
    },
    {
      date: new Date('2026-05-19'), // Thứ 2
      hours: 2.0,
      dayType: 'WEEKDAY',
      reason: 'Fix hotfix production',
    },
    // 1 WEEKEND
    {
      date: new Date('2026-05-10'), // Thứ 7
      hours: 4.0,
      dayType: 'WEEKEND',
      reason: 'Hỗ trợ go-live module mới',
    },
    // 1 HOLIDAY
    {
      date: new Date('2026-05-30'), // Ngày 30/4 - nghỉ lễ (giả sử)
      hours: 8.0,
      dayType: 'HOLIDAY',
      reason: 'Trực ca ngày lễ',
    },
  ];

  for (const ot of approvedOtData) {
    await prisma.$executeRaw`
      INSERT INTO overtime_requests
        (id, employee_id, date, hours, day_type, reason, status, created_at, updated_at)
      VALUES
        (gen_random_uuid(), ${employee.id}, ${ot.date}::date, ${ot.hours},
         ${ot.dayType}::"ot_day_type", ${ot.reason}, 'APPROVED', now(), now())
      ON CONFLICT (employee_id, date) DO UPDATE SET
        status = 'APPROVED',
        day_type = ${ot.dayType}::"ot_day_type",
        hours = ${ot.hours},
        updated_at = now()
    `;
  }

  console.log('✓ Tạo 5 OvertimeRequest APPROVED (3 WEEKDAY, 1 WEEKEND, 1 HOLIDAY)');

  // ─── 2 OvertimeRequest PENDING (không được tính vào payroll) ───────────────

  const pendingOtData = [
    {
      date: new Date('2026-05-20'),
      hours: 2.0,
      dayType: 'WEEKDAY',
      reason: 'Chờ duyệt — training nội bộ',
    },
    {
      date: new Date('2026-05-21'),
      hours: 1.5,
      dayType: 'WEEKDAY',
      reason: 'Chờ duyệt — review code',
    },
  ];

  for (const ot of pendingOtData) {
    await prisma.$executeRaw`
      INSERT INTO overtime_requests
        (id, employee_id, date, hours, day_type, reason, status, created_at, updated_at)
      VALUES
        (gen_random_uuid(), ${employee.id}, ${ot.date}::date, ${ot.hours},
         ${ot.dayType}::"ot_day_type", ${ot.reason}, 'PENDING', now(), now())
      ON CONFLICT (employee_id, date) DO UPDATE SET
        status = 'PENDING',
        day_type = ${ot.dayType}::"ot_day_type",
        hours = ${ot.hours},
        updated_at = now()
    `;
  }

  console.log('✓ Tạo 2 OvertimeRequest PENDING (không tính vào payroll)');

  // ─── 2 LeaveRequest APPROVED với LeaveType.isPaid = false ──────────────────

  // Lấy hoặc tạo LeaveType unpaid
  let unpaidLeaveType = await prisma.leaveType.findFirst({
    where: { isPaid: false, isActive: true },
  });

  if (!unpaidLeaveType) {
    unpaidLeaveType = await prisma.leaveType.create({
      data: {
        name: 'Nghỉ không lương',
        maxDaysPerYear: 30,
        annualDays: 0,
        maxCarryOver: 0,
        isPaid: false,
        color: '#94A3B8',
        isActive: true,
      },
    });
    console.log('✓ Tạo LeaveType "Nghỉ không lương"');
  } else {
    console.log(`✓ Dùng LeaveType unpaid hiện có: ${unpaidLeaveType.name}`);
  }

  const unpaidLeaveData = [
    {
      startDate: new Date('2026-05-15'),
      endDate: new Date('2026-05-15'),
      days: 1.0,
      reason: 'Việc gia đình cá nhân',
    },
    {
      startDate: new Date('2026-05-22'),
      endDate: new Date('2026-05-23'),
      days: 2.0,
      reason: 'Công việc cá nhân khẩn cấp',
    },
  ];

  for (const lr of unpaidLeaveData) {
    // Kiểm tra xem đã tồn tại chưa trước khi tạo
    const existing = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        leaveTypeId: unpaidLeaveType.id,
        startDate: lr.startDate,
      },
    });

    if (!existing) {
      await prisma.leaveRequest.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: unpaidLeaveType.id,
          startDate: lr.startDate,
          endDate: lr.endDate,
          days: lr.days,
          reason: lr.reason,
          status: 'APPROVED',
          ...(employee.tenantId ? { tenantId: employee.tenantId } : {}),
        },
      });
    }
  }

  console.log('✓ Tạo 2 LeaveRequest APPROVED với LeaveType.isPaid = false');

  // ─── Cập nhật LeaveType paid có sẵn để có annualDays + maxCarryOver ────────

  await prisma.leaveType.updateMany({
    where: { isPaid: true, isActive: true },
    data: {
      annualDays: 12,   // 12 ngày phép năm cơ bản
      maxCarryOver: 5,  // Tối đa 5 ngày được chuyển sang năm sau
    },
  });

  console.log('✓ Cập nhật LeaveType paid: annualDays=12, maxCarryOver=5 (cho E16.3 year-end settlement)');

  console.log('\nSeed E16 hoàn thành!');
  console.log('Tóm tắt:');
  console.log(`  Employee: ${employee.id}`);
  console.log(`  Kỳ lương: ${periodStart.toLocaleDateString('vi-VN')} – ${periodEnd.toLocaleDateString('vi-VN')}`);
  console.log('  OT APPROVED: 3 WEEKDAY (2.5h + 3h + 2h) + 1 WEEKEND (4h) + 1 HOLIDAY (8h) = 19.5h');
  console.log('  OT PENDING: 2 request × không tính');
  console.log('  Leave Unpaid APPROVED: 1 ngày + 2 ngày = 3 ngày khấu trừ');
}

main()
  .catch((e) => {
    console.error('Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
