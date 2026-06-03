import {
  Injectable,
  BadRequestException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { TimesheetStatus, Role } from '../../generated/prisma';
import type { GeneratePeriodDto } from '../dto/generate-period.dto';
import { TenantAwareService } from '../../common/services/tenant-aware.service';
import { WorkShiftsService } from '../../work-shifts/work-shifts.service';
import { WORK_DAYS, toDateOnly, isoWeekday, calcShiftDurationHours } from '../timesheet.util';

@Injectable({ scope: Scope.REQUEST })
export class TimesheetPeriodProvider extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workShiftsService: WorkShiftsService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── E16F.1 — Work-day count excluding holidays ────────────────────────────────
  // Trả số ngày làm việc T2-T6 trong khoảng [start, end], loại trừ ngày lễ
  // Tính danh sách ngày làm thực tế theo lịch nhân viên, loại ngày lễ và ca OFF.
  async getWorkDaysInPeriod(start: Date, end: Date, employeeId?: string): Promise<Date[]> {
    // Tất cả ngày trong kỳ (kể cả T7/CN)
    const allDays: Date[] = [];
    const cur = toDateOnly(start);
    const fin = toDateOnly(end);
    while (cur <= fin) { allDays.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }

    // Ngày lễ
    const holidays = await this.prisma.holidayCalendar.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    });
    const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

    // Lọc: giữ lại ngày không phải lễ và không phải ca OFF
    const result: Date[] = [];
    for (const day of allDays) {
      const key = day.toISOString().slice(0, 10);
      if (holidaySet.has(key)) continue;
      if (employeeId) {
        // Bắt buộc có ca mới tính ngày chuẩn — không fallback Mon-Fri
        const shift = await this.workShiftsService.resolveShiftForDate(employeeId, day);
        if (!shift || (shift as any).type === 'CA_OFF') continue;
        // Loại ngày không thuộc thứ làm việc của ca (vd office off T7/CN, công nhân off CN)
        const wd = (shift as any).workingDays as number[] | undefined;
        if (wd && wd.length > 0 && !wd.includes(isoWeekday(day))) continue;
      } else {
        // Không có employeeId (tính tổng quát): Mon-Fri
        if (!WORK_DAYS.has(isoWeekday(day))) continue;
      }
      result.push(day);
    }
    return result;
  }

  // ── Period Generation ───────────────────────────────────────────────────────

  async generatePeriod(callerId: string, callerRole: Role, dto: GeneratePeriodDto) {
    const targetUserId = dto.userId && callerRole !== Role.MEMBER
      ? dto.userId
      : callerId;

    const start = toDateOnly(dto.periodStart);
    const end = toDateOnly(dto.periodEnd);

    // Lấy thông tin employee để query ca làm việc
    const employee = await this.prisma.employee.findFirst({
      where: { userId: targetUserId },
      select: { id: true },
    });

    // Kiểm tra ca làm việc — nếu chưa có ca thì lưu trạng thái MISSING_SHIFT
    if (employee?.id) {
      const shiftAtStart = await this.workShiftsService.resolveShiftForDate(employee.id, start);
      if (!shiftAtStart) {
        return this.prisma.timesheetRecord.upsert({
          where: { userId_periodStart: { userId: targetUserId, periodStart: start } },
          create: {
            userId: targetUserId,
            periodStart: start,
            periodEnd: end,
            workingDays: 0,
            standardDays: 0,
            overtimeHours: 0,
            otWeekdayHours: 0,
            otWeekendHours: 0,
            otHolidayHours: 0,
            leaveDays: 0,
            status: TimesheetStatus.MISSING_SHIFT,
          },
          update: {
            periodEnd: end,
            workingDays: 0,
            standardDays: 0,
            overtimeHours: 0,
            otWeekdayHours: 0,
            otWeekendHours: 0,
            otHolidayHours: 0,
            status: TimesheetStatus.MISSING_SHIFT,
          },
        });
      }
    }

    // standardDays = ngày làm thực tế theo lịch nhân viên (loại ca OFF + ngày lễ)
    const workDays = await this.getWorkDaysInPeriod(start, end, employee?.id);
    const standardDays = workDays.length;

    // Lấy danh sách ngày lễ để phân loại OT
    const holidays = await this.prisma.holidayCalendar.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    });
    const holidaySet = new Set(
      holidays.map((h) => h.date.toISOString().slice(0, 10)),
    );

    const entries = await this.prisma.timeEntry.findMany({
      where: this.tenantWhere({
        userId: targetUserId,
        date: { gte: start, lte: end },
      }),
    });

    const entryByDate = new Map(
      entries.map((e) => [e.date.toISOString().slice(0, 10), e]),
    );

    let workingDays = 0;
    let otWeekdayHours = 0;
    let otWeekendHours = 0;
    let otHolidayHours = 0;

    // Duyệt tất cả ngày trong kỳ (bao gồm cả T7/CN) để tính OT cuối tuần/ngày lễ
    const allDays: Date[] = [];
    const cur = toDateOnly(start);
    const fin = toDateOnly(end);
    while (cur <= fin) {
      allDays.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    for (const day of allDays) {
      const key = day.toISOString().slice(0, 10);
      const e = entryByDate.get(key);
      if (!e?.checkInAt || !e.checkOutAt) continue;

      const rawHours =
        (e.checkOutAt.getTime() - e.checkInAt.getTime()) / 3_600_000;

      // E16F.3 — Lấy ca làm việc theo lịch xoay / phân công (bắt buộc có ca mới tính OT)
      const dayShift = employee?.id
        ? await this.workShiftsService.resolveShiftForDate(employee.id, day)
        : null;

      let effectiveShiftHours = 8; // fallback an toàn nếu ca kết thúc giữa kỳ
      let breakHours = 1;
      if (dayShift) {
        const shiftDuration = calcShiftDurationHours(dayShift.startTime, dayShift.endTime);
        breakHours = (dayShift as any).breakMinutes / 60;
        effectiveShiftHours = shiftDuration - breakHours;
      }

      const workedHours = rawHours - breakHours;
      const otHours = Math.max(0, workedHours - effectiveShiftHours);

      const dayOfWeek = day.getDay(); // 0=Sun, 6=Sat
      const isHoliday = holidaySet.has(key);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Ca OFF: dựa vào resolveShiftForDate — không fallback Mon-Fri
      const isOffShift = !dayShift || (dayShift as any).type === 'CA_OFF';

      // Chỉ đếm ngày công nếu KHÔNG phải ca off và KHÔNG phải ngày lễ
      if (!isOffShift && !isHoliday) {
        workingDays += 1;
      }

      // Phân loại OT: làm việc vào ngày lễ/ca off/cuối tuần là OT
      if (otHours > 0) {
        if (isHoliday) {
          otHolidayHours += otHours;
        } else if (isOffShift || isWeekend) {
          otWeekendHours += otHours;
        } else {
          otWeekdayHours += otHours;
        }
      }
    }

    const totalOvertimeHours = otWeekdayHours + otWeekendHours + otHolidayHours;

    const record = await this.prisma.timesheetRecord.upsert({
      where: {
        userId_periodStart: { userId: targetUserId, periodStart: start },
      },
      create: {
        userId: targetUserId,
        periodStart: start,
        periodEnd: end,
        workingDays,
        standardDays,
        overtimeHours: +totalOvertimeHours.toFixed(2),
        otWeekdayHours: +otWeekdayHours.toFixed(2),
        otWeekendHours: +otWeekendHours.toFixed(2),
        otHolidayHours: +otHolidayHours.toFixed(2),
        leaveDays: 0,
        status: TimesheetStatus.DRAFT,
      },
      update: {
        workingDays,
        standardDays,
        overtimeHours: +totalOvertimeHours.toFixed(2),
        otWeekdayHours: +otWeekdayHours.toFixed(2),
        otWeekendHours: +otWeekendHours.toFixed(2),
        otHolidayHours: +otHolidayHours.toFixed(2),
        periodEnd: end,
      },
    });

    return record;
  }

  // ── Period Detail ───────────────────────────────────────────────────────────

  async getPeriodDetail(userId: string, periodStart: string, periodEnd: string) {
    const start = toDateOnly(periodStart);
    const end = toDateOnly(periodEnd);

    const [record, entries] = await Promise.all([
      this.prisma.timesheetRecord.findFirst({
        where: { userId, periodStart: start },
      }),
      this.prisma.timeEntry.findMany({
        where: this.tenantWhere({ userId, date: { gte: start, lte: end } }),
        orderBy: { date: 'asc' },
      }),
    ]);

    const entryMap = new Map(
      entries.map((e) => [e.date.toISOString().slice(0, 10), e]),
    );

    // Lấy employee để kiểm tra ca off
    const employeeForDetail = await this.prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });

    // Lấy AttendanceRecord để enrich ca làm việc, đi muộn, về sớm
    const attendanceRecords = employeeForDetail?.id
      ? await this.prisma.attendanceRecord.findMany({
          where: { employeeId: employeeForDetail.id, date: { gte: start, lte: end } },
          select: {
            date: true, plannedStart: true, plannedEnd: true,
            lateMinutes: true, earlyLeaveMinutes: true, overtimeMinutes: true,
          },
        })
      : [];
    const attendanceMap = new Map(
      attendanceRecords.map((r) => [r.date.toISOString().slice(0, 10), r]),
    );

    // Lấy thông tin phép đã được duyệt trong kỳ
    const leaveRequests = employeeForDetail?.id
      ? await this.prisma.leaveRequest.findMany({
          where: {
            employeeId: employeeForDetail.id,
            status: 'APPROVED',
            startDate: { lte: end },
            endDate: { gte: start },
          },
          include: { leaveType: { select: { id: true, name: true, color: true, isPaid: true } } },
        })
      : [];

    // Build map date → leaveInfo
    const leaveByDate = new Map<string, { name: string; color: string; isPaid: boolean }>();
    for (const lr of leaveRequests) {
      const s = toDateOnly(lr.startDate as Date);
      const e = toDateOnly(lr.endDate as Date);
      const c = new Date(s);
      while (c <= e) {
        leaveByDate.set(c.toISOString().slice(0, 10), {
          name: lr.leaveType?.name ?? 'Nghỉ phép',
          color: lr.leaveType?.color ?? '#6366F1',
          isPaid: lr.leaveType?.isPaid ?? true,
        });
        c.setDate(c.getDate() + 1);
      }
    }

    // Duyệt TẤT CẢ ngày trong kỳ (kể cả T7/CN)
    const allDaysDetail: Date[] = [];
    const curD = toDateOnly(start);
    const finD = toDateOnly(end);
    while (curD <= finD) { allDaysDetail.push(new Date(curD)); curD.setDate(curD.getDate() + 1); }

    const dayRows: Array<{
      date: string; checkIn: Date | null; checkOut: Date | null;
      workHours: number | null; overtimeHours: number;
      status: 'present' | 'absent' | 'off' | 'leave'; isManualCorrection: boolean;
      dayCredit: number;
      leaveInfo: { name: string; color: string; isPaid: boolean } | null;
      plannedStart: string | null; plannedEnd: string | null;
      lateMinutes: number; earlyLeaveMinutes: number;
    }> = [];

    for (const day of allDaysDetail) {
      const key = day.toISOString().slice(0, 10);

      // Kiểm tra ca off theo lịch nhân viên
      const isOff = employeeForDetail?.id
        ? await this.workShiftsService.isOffDay(employeeForDetail.id, day)
        : (day.getDay() === 0 || day.getDay() === 6);

      const e = entryMap.get(key);
      let workHours: number | null = null;
      let overtimeHours = 0;

      if (e?.checkInAt && e.checkOutAt) {
        workHours = +((e.checkOutAt.getTime() - e.checkInAt.getTime()) / 3_600_000).toFixed(2);
        if (workHours > 8) overtimeHours = +(workHours - 8).toFixed(2);
      }

      let status: 'present' | 'absent' | 'off' | 'leave';
      if (e?.checkInAt) {
        status = 'present';
      } else if (isOff) {
        status = 'off';
      } else if (leaveByDate.get(key)) {
        // Có đơn phép được duyệt, không cần check-in → không phải vắng
        status = 'leave';
      } else {
        status = 'absent';
      }

      // Tính ngày công:
      // - Ca off hoặc vắng → 0
      // - Có đủ checkIn + checkOut không lỗi (workHours >= 8) → 1
      // - Có chấm công nhưng thiếu (muộn/về sớm/thiếu giờ, workHours < 8) → workHours / 8
      // - Chỉ có checkIn không có checkOut → 0.5 (chưa đủ dữ liệu)
      let dayCredit = 0;
      if (status === 'present') {
        if (workHours !== null && workHours >= 8) {
          dayCredit = 1;
        } else if (workHours !== null && workHours > 0) {
          dayCredit = +Math.min(1, workHours / 8).toFixed(2);
        } else if (e?.checkInAt && !e.checkOutAt) {
          dayCredit = 0.5; // Chỉ có giờ vào, chưa có giờ ra
        }
      }

      const ar = attendanceMap.get(key);
      dayRows.push({
        date: key,
        checkIn: e?.checkInAt ?? null,
        checkOut: e?.checkOutAt ?? null,
        workHours,
        overtimeHours,
        status,
        isManualCorrection: e?.isManualCorrection ?? false,
        dayCredit,
        leaveInfo: leaveByDate.get(key) ?? null,
        plannedStart: ar?.plannedStart ?? null,
        plannedEnd: ar?.plannedEnd ?? null,
        lateMinutes: ar?.lateMinutes ?? 0,
        earlyLeaveMinutes: ar?.earlyLeaveMinutes ?? 0,
      });
    }

    return { record, days: dayRows };
  }

  // ── Manual Day Entry ───────────────────────────────────────────────────────

  async manualDayEntry(userId: string, date: string, hours: number) {
    if (hours < 0 || hours > 24) throw new BadRequestException('Số giờ không hợp lệ (0–24)');
    const day = toDateOnly(date);
    const checkIn = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 0, 0);
    const checkOut = new Date(checkIn.getTime() + hours * 3_600_000);
    await this.prisma.timeEntry.upsert({
      where: { userId_date: { userId, date: day } },
      create: { userId, date: day, checkInAt: checkIn, checkOutAt: checkOut, isManualCorrection: true },
      update: { checkInAt: checkIn, checkOutAt: checkOut, isManualCorrection: true },
    });
    return { date, hours };
  }

  // ── Project Timesheet Summary ───────────────────────────────────────────────

  async getProjectSummary(projectId: string, year: number, month: number, caller: { id: string; role: Role }) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    let assigneeFilter: Record<string, unknown> = {};
    if (caller.role === Role.MEMBER) {
      const employee = await this.prisma.employee.findFirst({
        where: { userId: caller.id },
        select: { id: true },
      });
      if (!employee) return { members: [], dailyTotal: {}, grandTotal: 0 };
      assigneeFilter = { assigneeId: employee.id };
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        status: 'DONE',
        dueDate: { gte: start, lte: end },
        assigneeId: { not: null },
        ...assigneeFilter,
      },
      select: {
        assigneeId: true,
        estimateHours: true,
        dueDate: true,
        assignee: { select: { id: true, fullName: true } },
      },
    });

    const memberMap = new Map<string, {
      employeeId: string;
      name: string;
      daily: Record<string, number>;
      total: number;
    }>();

    for (const task of tasks) {
      if (!task.assigneeId || !task.dueDate) continue;
      const day = String(task.dueDate.getDate());
      const hours = Number(task.estimateHours);

      if (!memberMap.has(task.assigneeId)) {
        memberMap.set(task.assigneeId, {
          employeeId: task.assigneeId,
          name: task.assignee?.fullName ?? 'Chưa rõ',
          daily: {},
          total: 0,
        });
      }

      const member = memberMap.get(task.assigneeId)!;
      member.daily[day] = (member.daily[day] ?? 0) + hours;
      member.total += hours;
    }

    const members = Array.from(memberMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi'),
    );

    const dailyTotal: Record<string, number> = {};
    let grandTotal = 0;
    for (const m of members) {
      for (const [day, hours] of Object.entries(m.daily)) {
        dailyTotal[day] = (dailyTotal[day] ?? 0) + hours;
      }
      grandTotal += m.total;
    }

    return { members, dailyTotal, grandTotal };
  }
}
