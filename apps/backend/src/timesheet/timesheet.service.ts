import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckInMethod,
  TimesheetStatus,
  WorkStatusType,
  NotificationType,
  Role,
} from '../generated/prisma';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GeneratePeriodDto, RejectTimesheetDto } from './dto/generate-period.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { WorkShiftsService } from '../work-shifts/work-shifts.service';

// Mon=1 … Fri=5 (ISO weekday)
const WORK_DAYS = new Set([1, 2, 3, 4, 5]);

function toDateOnly(d: Date | string): Date {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function isoWeekday(d: Date): number {
  const day = d.getDay(); // 0=Sun … 6=Sat
  return day === 0 ? 7 : day; // 1=Mon … 7=Sun
}

function eachWorkDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = toDateOnly(start);
  const fin = toDateOnly(end);
  while (cur <= fin) {
    if (WORK_DAYS.has(isoWeekday(cur))) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

@Injectable({ scope: Scope.REQUEST })
export class TimesheetService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workShiftsService: WorkShiftsService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── Check-in ────────────────────────────────────────────────────────────────

  async checkIn(userId: string, dto: CheckInDto) {
    const today = toDateOnly(new Date());
    const existing = await this.prisma.timeEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (existing) {
      throw new ConflictException('Đã chấm công vào hôm nay');
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        userId,
        date: today,
        checkInAt: new Date(),
        checkInLat: dto.lat ?? null,
        checkInLng: dto.lng ?? null,
        checkInMethod: dto.method ?? CheckInMethod.MANUAL,
        tenantId: this.getTenantId(),
      },
    });

    // Also set working status if not already set
    await this.setStatus(userId, { statusType: WorkStatusType.WORKING });

    return entry;
  }

  // ── Check-out ───────────────────────────────────────────────────────────────

  async checkOut(userId: string, dto: CheckOutDto) {
    const today = toDateOnly(new Date());
    const entry = await this.prisma.timeEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (!entry) {
      throw new NotFoundException('Chưa chấm công vào hôm nay');
    }
    if (entry.checkOutAt) {
      throw new ConflictException('Đã chấm công ra hôm nay');
    }

    const updated = await this.prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        checkOutAt: new Date(),
        checkOutLat: dto.lat ?? null,
        checkOutLng: dto.lng ?? null,
      },
    });

    // End current work status
    await this.endCurrentStatus(userId);

    return updated;
  }

  // ── Quick Status Update ─────────────────────────────────────────────────────

  async setStatus(userId: string, dto: UpdateStatusDto) {
    await this.endCurrentStatus(userId);

    const status = await this.prisma.workStatus.create({
      data: {
        userId,
        statusType: dto.statusType,
        startedAt: new Date(),
        note: dto.note ?? null,
      },
    });

    return { currentStatus: status.statusType, since: status.startedAt };
  }

  private async endCurrentStatus(userId: string) {
    await this.prisma.workStatus.updateMany({
      where: { userId, endedAt: null },
      data: { endedAt: new Date() },
    });
  }

  // ── Today Summary ───────────────────────────────────────────────────────────

  async getTodaySummary(userId: string) {
    const today = toDateOnly(new Date());
    const [entry, currentStatus] = await Promise.all([
      this.prisma.timeEntry.findUnique({
        where: { userId_date: { userId, date: today } },
      }),
      this.prisma.workStatus.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    let workingHours: number | null = null;
    if (entry?.checkInAt && entry.checkOutAt) {
      workingHours =
        (entry.checkOutAt.getTime() - entry.checkInAt.getTime()) / 3_600_000;
    } else if (entry?.checkInAt) {
      workingHours =
        (Date.now() - entry.checkInAt.getTime()) / 3_600_000;
    }

    return {
      checkIn: entry?.checkInAt ?? null,
      checkOut: entry?.checkOutAt ?? null,
      currentStatus: currentStatus?.statusType ?? null,
      since: currentStatus?.startedAt ?? null,
      workingHours: workingHours !== null ? +workingHours.toFixed(2) : null,
    };
  }

  // ── Team Status (Manager / Leadership) ──────────────────────────────────────

  async getTeamStatus(orgUnitIds: string[] | null) {
    const today = toDateOnly(new Date());
    const orgWhere = orgUnitIds === null ? {} : { orgUnitId: { in: orgUnitIds } };

    const users = await this.prisma.user.findMany({
      where: { ...orgWhere, isActive: true },
      select: { id: true, name: true },
      take: 500,
    });

    const userIds = users.map((u) => u.id);

    const [statuses, entries] = await Promise.all([
      this.prisma.workStatus.findMany({
        where: { userId: { in: userIds }, endedAt: null },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.timeEntry.findMany({
        where: { userId: { in: userIds }, date: today },
      }),
    ]);

    const statusMap = new Map(statuses.map((s) => [s.userId, s]));
    const entryMap = new Map(entries.map((e) => [e.userId, e]));

    return users.map((u) => {
      const ws = statusMap.get(u.id);
      const te = entryMap.get(u.id);
      return {
        userId: u.id,
        name: u.name,
        currentStatus: ws?.statusType ?? null,
        since: ws?.startedAt ?? null,
        todayCheckIn: te?.checkInAt ?? null,
        todayCheckOut: te?.checkOutAt ?? null,
      };
    });
  }

  // ── E16F.1 — Work-day count excluding holidays ────────────────────────────────
  // Trả số ngày làm việc T2-T6 trong khoảng [start, end], loại trừ ngày lễ
  // từ HolidayCalendar. Được dùng để tính standardDays.
  async getWorkDaysInPeriod(start: Date, end: Date): Promise<Date[]> {
    const allWorkDays = eachWorkDay(start, end);

    // Query ngày lễ trong khoảng thời gian
    const holidays = await this.prisma.holidayCalendar.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    });

    const holidaySet = new Set(
      holidays.map((h) => h.date.toISOString().slice(0, 10)),
    );

    // Loại ngày lễ ra khỏi danh sách ngày làm việc
    return allWorkDays.filter(
      (d) => !holidaySet.has(d.toISOString().slice(0, 10)),
    );
  }

  // ── Period Generation ───────────────────────────────────────────────────────

  async generatePeriod(callerId: string, callerRole: Role, dto: GeneratePeriodDto) {
    const targetUserId = dto.userId && callerRole !== Role.MEMBER
      ? dto.userId
      : callerId;

    const start = toDateOnly(dto.periodStart);
    const end = toDateOnly(dto.periodEnd);

    // E16F.1 — standardDays loại trừ ngày lễ
    const workDays = await this.getWorkDaysInPeriod(start, end);
    const standardDays = workDays.length;

    // Lấy danh sách ngày lễ để phân loại OT (E16F.3)
    const holidays = await this.prisma.holidayCalendar.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    });
    const holidaySet = new Set(
      holidays.map((h) => h.date.toISOString().slice(0, 10)),
    );

    // Lấy thông tin employee để query ca làm việc (E16F.3)
    const employee = await this.prisma.employee.findFirst({
      where: { userId: targetUserId },
      select: { id: true },
    });

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

      // E16F.3 — Lấy ca làm việc active để tính giờ OT chuẩn xác
      let effectiveShiftHours = 8; // fallback: ca hành chính 8-17, nghỉ trưa 1h = 8h
      let breakHours = 1;          // fallback break = 1h
      if (employee?.id) {
        const shift = await this.workShiftsService.getActiveShift(employee.id, day);
        if (shift) {
          const shiftDuration = this.calcShiftDurationHours(shift.startTime, shift.endTime);
          breakHours = shift.breakMinutes / 60;
          effectiveShiftHours = shiftDuration - breakHours;
        }
      }

      const workedHours = rawHours - breakHours;
      const otHours = Math.max(0, workedHours - effectiveShiftHours);

      const dayOfWeek = day.getDay(); // 0=Sun, 6=Sat
      const isHoliday = holidaySet.has(key);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Đếm ngày công chỉ cho T2-T6 không phải ngày lễ
      if (!isWeekend && !isHoliday) {
        workingDays += 1;
      }

      // Phân loại OT theo thứ tự ưu tiên: holiday > weekend > weekday
      if (otHours > 0) {
        if (isHoliday) {
          otHolidayHours += otHours;
        } else if (isWeekend) {
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

  // Tính tổng thời lượng ca (giờ) từ startTime/endTime dạng "HH:MM"
  // Xử lý ca đêm (endTime < startTime)
  private calcShiftDurationHours(startTime: string, endTime: string): number {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const startMins = toMins(startTime);
    let endMins = toMins(endTime);
    if (endMins <= startMins) endMins += 24 * 60; // ca đêm vắt qua ngày mới
    return (endMins - startMins) / 60;
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

    const days = eachWorkDay(start, end).map((day) => {
      const key = day.toISOString().slice(0, 10);
      const e = entryMap.get(key);
      let workHours: number | null = null;
      let overtimeHours = 0;
      if (e?.checkInAt && e.checkOutAt) {
        workHours = +(
          (e.checkOutAt.getTime() - e.checkInAt.getTime()) / 3_600_000
        ).toFixed(2);
        if (workHours > 8) overtimeHours = +(workHours - 8).toFixed(2);
      }
      return {
        date: key,
        checkIn: e?.checkInAt ?? null,
        checkOut: e?.checkOutAt ?? null,
        workHours,
        overtimeHours,
        status: e?.checkInAt ? 'present' : 'absent',
        isManualCorrection: e?.isManualCorrection ?? false,
      };
    });

    return { record, days };
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

  // ── Submit ──────────────────────────────────────────────────────────────────

  async submit(id: string, userId: string) {
    const record = await this.findRecordOrFail(id);
    if (record.userId !== userId) throw new ForbiddenException();
    if (record.status !== TimesheetStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể nộp bảng công ở trạng thái Bản nháp');
    }

    const updated = await this.prisma.timesheetRecord.update({
      where: { id },
      data: { status: TimesheetStatus.SUBMITTED, submittedAt: new Date() },
    });

    // Notify manager (simplified — find users in parent org unit with PM/ADMIN role)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { orgUnit: { include: { parent: true } } },
    });
    if (user?.orgUnit?.parentId) {
      const managers = await this.prisma.user.findMany({
        where: {
          orgUnitId: user.orgUnit.parentId,
          role: { in: [Role.PM, Role.ADMIN] },
        },
      });
      if (managers.length) {
        await this.prisma.notification.createMany({
          data: managers.map((m) => ({
            userId: m.id,
            type: NotificationType.TIMESHEET_SUBMITTED,
            title: 'Bảng công chờ duyệt',
            body: `${user.name} đã nộp bảng công tháng ${updated.periodStart.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}`,
            payload: { timesheetId: id },
          })),
        });
      }
    }

    return updated;
  }

  // ── Approve ─────────────────────────────────────────────────────────────────

  async approve(id: string, approverId: string) {
    const record = await this.findRecordOrFail(id);
    if (record.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Chỉ có thể duyệt bảng công ở trạng thái Đã nộp');
    }

    const updated = await this.prisma.timesheetRecord.update({
      where: { id },
      data: {
        status: TimesheetStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: approverId,
        lockedAt: new Date(),
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: record.userId,
        type: NotificationType.TIMESHEET_APPROVED,
        title: 'Bảng công đã được duyệt',
        body: `Bảng công của bạn đã được phê duyệt`,
        payload: { timesheetId: id },
      },
    });

    return updated;
  }

  // ── Reject ──────────────────────────────────────────────────────────────────

  async reject(id: string, _approverId: string, dto: RejectTimesheetDto) {
    const record = await this.findRecordOrFail(id);
    if (record.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Chỉ có thể từ chối bảng công ở trạng thái Đã nộp');
    }

    const updated = await this.prisma.timesheetRecord.update({
      where: { id },
      data: {
        status: TimesheetStatus.REJECTED,
        rejectionReason: dto.reason,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: record.userId,
        type: NotificationType.TIMESHEET_REJECTED,
        title: 'Bảng công bị từ chối',
        body: `Lý do: ${dto.reason}`,
        payload: { timesheetId: id },
      },
    });

    return updated;
  }

  // ── Pending Approval List ───────────────────────────────────────────────────

  async getPendingApproval(orgUnitIds: string[] | null) {
    const threshold48h = new Date(Date.now() - 48 * 3_600_000);
    const userOrgFilter = orgUnitIds === null ? {} : { orgUnitId: { in: orgUnitIds } };
    const records = await this.prisma.timesheetRecord.findMany({
      where: {
        status: TimesheetStatus.SUBMITTED,
        user: userOrgFilter,
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { submittedAt: 'asc' },
      take: 500,
    });

    return records.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user.name,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      submittedAt: r.submittedAt,
      isOverdue: r.submittedAt ? r.submittedAt < threshold48h : false,
    }));
  }

  // ── Auto-Escalation (called by scheduler) ───────────────────────────────────

  async checkTimesheetEscalation(): Promise<void> {
    const threshold48h = new Date(Date.now() - 48 * 3_600_000);

    const overdueRecords = await this.prisma.timesheetRecord.findMany({
      where: {
        status: TimesheetStatus.SUBMITTED,
        submittedAt: { lt: threshold48h },
      },
      include: {
        user: {
          include: { orgUnit: { include: { parent: true } } },
        },
      },
      take: 500,
    });

    for (const record of overdueRecords) {
      // Skip if escalation notification already sent for this record
      const alreadyEscalated = await this.prisma.notification.findFirst({
        where: {
          type: NotificationType.TIMESHEET_APPROVAL_ESCALATED,
          payload: { path: ['timesheetId'], equals: record.id },
        },
      });
      if (alreadyEscalated) continue;

      const parentOrgUnitId = record.user.orgUnit?.parentId;
      if (!parentOrgUnitId) continue;

      const escalationTargets = await this.prisma.user.findMany({
        where: {
          orgUnitId: parentOrgUnitId,
          role: { in: [Role.PM, Role.ADMIN, Role.LEADERSHIP] },
          isActive: true,
        },
      });
      if (!escalationTargets.length) continue;

      const month = record.periodStart.toLocaleDateString('vi-VN', {
        month: '2-digit',
        year: 'numeric',
      });

      await this.prisma.notification.createMany({
        data: escalationTargets.map((m) => ({
          userId: m.id,
          type: NotificationType.TIMESHEET_APPROVAL_ESCALATED,
          title: 'Bảng công cần duyệt khẩn',
          body: `Bảng công tháng ${month} của ${record.user.name} đã chờ duyệt hơn 48 giờ`,
          payload: { timesheetId: record.id, employeeName: record.user.name },
        })),
      });
    }
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async findRecordOrFail(id: string) {
    const record = await this.prisma.timesheetRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy bảng công');
    return record;
  }
}
