import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';
import {
  AttendanceQueryDto,
  CreateAttendanceDto,
  LockMonthDto,
  MonthlyAttendanceQueryDto,
  SummarizeMonthDto,
} from './dto/attendance.dto';
import { AttendanceStatus, AttendanceAnomaly, MonthlyAttendanceStatus, TimesheetStatus } from '../generated/prisma';
import { WorkShiftsService } from '../work-shifts/work-shifts.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';

// Default scope: tenant lấy qua CLS (HTTP middleware + worker đều set) → dùng được
// trong cả request lẫn BullMQ worker (cơ chế tự tính lại công).
@Injectable()
export class HrAttendanceService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workShiftsService: WorkShiftsService,
  ) {
    super();
  }

  // ─── Tính toán chỉ số ca làm việc từ giờ check-in/out thực tế ───────────────
  // Ngày công = (480 - lateMinutes - earlyLeaveMinutes) / 480
  // 480 = 8 giờ × 60 phút (1 ngày công chuẩn)
  calculateShiftMetrics(
    checkIn: Date,
    checkOut: Date,
    plannedStart?: string,
    plannedEnd?: string,
  ): { lateMinutes: number; earlyLeaveMinutes: number; overtimeMinutes: number; dayCredit: number; workMinutes: number } {
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

    // Tính tổng giờ làm việc (cho INFO)
    const totalMinutes = (checkOutMinutes < checkInMinutes
      ? checkOutMinutes + 24 * 60
      : checkOutMinutes) - checkInMinutes;

    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;
    let dayCredit = 0;
    let workMinutes = totalMinutes;

    if (plannedStart && plannedEnd) {
      const plannedStartMinutes = toMinutes(plannedStart);
      const plannedEndMinutes = toMinutes(plannedEnd);

      // Xử lý ca đêm (vắt qua ngày)
      const adjustedPlannedEnd =
        plannedEndMinutes < plannedStartMinutes
          ? plannedEndMinutes + 24 * 60
          : plannedEndMinutes;
      const adjustedCheckOut =
        checkOutMinutes < checkInMinutes
          ? checkOutMinutes + 24 * 60
          : checkOutMinutes;

      // ✅ Tính đi muộn / về sớm
      lateMinutes = Math.max(0, checkInMinutes - plannedStartMinutes);
      earlyLeaveMinutes = Math.max(0, adjustedPlannedEnd - adjustedCheckOut);
      overtimeMinutes = Math.max(0, adjustedCheckOut - adjustedPlannedEnd);

      // ✅ Ngày công chuẩn = (480 - lateMinutes - earlyLeaveMinutes) / 480
      // 480 phút = 8 giờ × 60 phút
      const standardWorkMinutes = 480; // 8 hours
      const actualWorkMinutes = standardWorkMinutes - lateMinutes - earlyLeaveMinutes;
      dayCredit = Math.max(0, actualWorkMinutes / standardWorkMinutes);
      workMinutes = Math.max(0, actualWorkMinutes);
    } else {
      // Không có planned time → tính theo tổng giờ làm việc
      const totalHours = Math.max(0, totalMinutes / 60);
      dayCredit = Math.min(1, totalHours / 8);
    }

    return { lateMinutes, earlyLeaveMinutes, overtimeMinutes, dayCredit, workMinutes };
  }

  // ─── 1. List bản ghi chấm công (paginated) ──────────────────────────────────
  async list(query: AttendanceQueryDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    // AttendanceRecord chưa có tenantId (v6 task)
    const where: any = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    // Lọc theo orgUnitId thông qua employee
    if (query.orgUnitId) {
      where.employee = { orgUnitId: query.orgUnitId };
    }

    const [records, total] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
        include: {
          employee: {
            select: {
              id: true, fullName: true, code: true, orgUnitId: true,
              orgUnit:  { select: { id: true, name: true, code: true } },
              position: { include: { jobTitle: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    // Enrich với thông tin phép từ LeaveRequest
    if (records.length > 0) {
      const employeeIds = [...new Set(records.map((r) => r.employeeId))];
      const dates = records.map((r) => r.date);
      const minDate = dates.reduce((a, b) => (a < b ? a : b));
      const maxDate = dates.reduce((a, b) => (a > b ? a : b));

      const leaveRequests = await this.prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: 'APPROVED',
          startDate: { lte: maxDate },
          endDate: { gte: minDate },
        },
        include: { leaveType: { select: { id: true, name: true, color: true, isPaid: true } } },
      });

      // Map: `${employeeId}_${date}` → leaveInfo
      const leaveMap = new Map<string, { name: string; color: string; isPaid: boolean }>();
      for (const lr of leaveRequests) {
        const s = new Date(lr.startDate as Date); s.setHours(0, 0, 0, 0);
        const e = new Date(lr.endDate as Date); e.setHours(0, 0, 0, 0);
        const c = new Date(s);
        while (c <= e) {
          leaveMap.set(`${lr.employeeId}_${c.toISOString().slice(0, 10)}`, {
            name: lr.leaveType?.name ?? 'Nghỉ phép',
            color: lr.leaveType?.color ?? '#6366F1',
            isPaid: lr.leaveType?.isPaid ?? true,
          });
          c.setDate(c.getDate() + 1);
        }
      }

      const enriched = records.map((r) => ({
        ...r,
        leaveInfo: leaveMap.get(`${r.employeeId}_${r.date.toISOString().slice(0, 10)}`) ?? null,
        // Sử dụng dayCredit từ DB (đã tính), fallback nếu không có
        dayCredit: r.dayCredit ?? (r.checkIn && r.checkOut && r.totalHours
          ? Number(r.totalHours) / 8 // không cap, tính luôn nếu có OT
          : r.checkIn ? 0.5 : 0),
      }));

      return paginate(enriched, total, page, limit);
    }

    return paginate(records, total, page, limit);
  }

  // ─── 2. Upsert bản ghi chấm công ────────────────────────────────────────────
  async upsert(dto: CreateAttendanceDto, userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    const date = new Date(dto.date);

    // Tính totalHours nếu có checkIn và checkOut
    let totalHours: number | null = null;
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;
    let plannedStart: string | null = null;
    let plannedEnd: string | null = null;
    let shiftId: string | null = null;

    let dayCredit = 0;
    if (dto.checkIn && dto.checkOut) {
      const checkInTime = new Date(dto.checkIn);
      const checkOutTime = new Date(dto.checkOut);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      totalHours = Math.max(0, diffMs / (1000 * 60 * 60));
      totalHours = Math.round(totalHours * 100) / 100; // làm tròn 2 số thập phân

      // Lấy ca làm việc active của nhân viên tại ngày này
      const activeShift = await this.workShiftsService.getActiveShift(
        dto.employeeId,
        date,
      );

      if (activeShift) {
        shiftId = activeShift.id;
        plannedStart = activeShift.startTime;
        plannedEnd = activeShift.endTime;
      }

      // Tính metrics (bao gồm dayCredit) — không phụ thuộc vào activeShift
      const metrics = this.calculateShiftMetrics(
        checkInTime,
        checkOutTime,
        plannedStart || undefined,
        plannedEnd || undefined,
      );
      lateMinutes = metrics.lateMinutes;
      earlyLeaveMinutes = metrics.earlyLeaveMinutes;
      overtimeMinutes = metrics.overtimeMinutes;
      dayCredit = Math.round(metrics.dayCredit * 100) / 100; // làm tròn 2 số thập phân

      // Cập nhật OT hours vào MonthlyAttendance nếu có OT
      if (overtimeMinutes > 0) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const otHoursDelta = overtimeMinutes / 60;

        const monthly = await this.prisma.monthlyAttendance.findUnique({
          where: { employeeId_year_month: { employeeId: dto.employeeId, year, month } },
        });

        if (monthly) {
          await this.prisma.monthlyAttendance.update({
            where: { id: monthly.id },
            data: { otHours: { increment: otHoursDelta } },
          });
        }
      }
    }

    const data: any = {
      employeeId: dto.employeeId,
      date,
      checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
      checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      totalHours,
      dayCredit,
      status: dto.status ?? AttendanceStatus.PRESENT,
      leaveType: dto.leaveType ?? null,
      note: dto.note ?? null,
      isManual: true,
    };

    return this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: dto.employeeId,
          date,
        },
      },
      create: {
        ...data,
        ...(shiftId && { shiftId }),
        ...(plannedStart && { plannedStart }),
        ...(plannedEnd && { plannedEnd }),
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
      },
      update: {
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalHours,
        dayCredit,
        status: data.status,
        leaveType: data.leaveType,
        note: data.note,
        isManual: true,
        ...(shiftId && { shiftId }),
        ...(plannedStart && { plannedStart }),
        ...(plannedEnd && { plannedEnd }),
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
      },
    });
  }

  // ─── 3. Calendar view — mảng trạng thái theo ngày trong tháng ───────────────
  async getCalendarView(employeeId: string, year: number, month: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // cuối tháng

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const daysInMonth = endDate.getDate();
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = records.find(
        (r) => r.date.toISOString().slice(0, 10) === dateStr,
      );
      return {
        date: dateStr,
        day,
        status: record?.status ?? null,
        checkIn: record?.checkIn ?? null,
        checkOut: record?.checkOut ?? null,
        totalHours: record?.totalHours ?? null,
        leaveType: record?.leaveType ?? null,
        note: record?.note ?? null,
        isManual: record?.isManual ?? false,
      };
    });

    return { employeeId, year, month, calendar };
  }

  // ─── 4. Tổng hợp bảng công tháng ────────────────────────────────────────────
  async summarizeMonth(dto: SummarizeMonthDto) {
    const { year, month, orgUnitId } = dto;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Lấy danh sách nhân viên (theo orgUnit nếu có)
    const employees = await this.prisma.employee.findMany({
      where: {
        isActive: true,
        ...(orgUnitId ? { orgUnitId } : {}),
      },
      select: { id: true },
    });

    if (employees.length === 0) {
      return { message: 'Không có nhân viên nào', updated: 0 };
    }

    const employeeIds = employees.map((e) => e.id);
    const lastDay = endDate.getDate();
    const dateKey = (d: Date) => d.toISOString().slice(0, 10);

    // ─── Prefetch (tránh N+1): giờ quẹt + phép + lễ + phân ca + bản ghi hiện có ──
    // Mở rộng +2 ngày cuối tháng để bắt giờ ra ca đêm vắt sang hôm sau.
    const punchRangeEnd = new Date(year, month - 1, lastDay + 2, 23, 59, 59);
    const punches = await this.prisma.attendancePunch.findMany({
      where: { employeeId: { in: employeeIds }, punchedAt: { gte: startDate, lte: punchRangeEnd } },
      select: { employeeId: true, punchedAt: true },
      orderBy: { punchedAt: 'asc' },
    });
    const punchesByEmp = new Map<string, Date[]>();
    for (const p of punches) {
      const arr = punchesByEmp.get(p.employeeId) ?? [];
      arr.push(p.punchedAt);
      punchesByEmp.set(p.employeeId, arr);
    }

    const leaves = await this.prisma.leaveRequest.findMany({
      where: { employeeId: { in: employeeIds }, status: 'APPROVED', startDate: { lte: endDate }, endDate: { gte: startDate } },
      include: { leaveType: { select: { isPaid: true } } },
    });
    const leaveMap = new Map<string, { isPaid: boolean; half: boolean }>();
    for (const lr of leaves) {
      const s = new Date(lr.startDate as Date);
      const e = new Date(lr.endDate as Date);
      const half = s.toISOString().slice(0, 10) === e.toISOString().slice(0, 10) && Number(lr.days) === 0.5;
      const c = new Date(s);
      while (c <= e) {
        leaveMap.set(`${lr.employeeId}_${dateKey(c)}`, { isPaid: lr.leaveType?.isPaid ?? true, half });
        c.setDate(c.getDate() + 1);
      }
    }

    const holidays = await this.prisma.holidayCalendar.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true },
    });
    const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { employeeId: { in: employeeIds }, effectiveFrom: { lte: endDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: startDate } }] },
      orderBy: { effectiveFrom: 'desc' },
      include: { shift: true },
    });
    const assignByEmp = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const arr = assignByEmp.get(a.employeeId) ?? [];
      arr.push(a);
      assignByEmp.set(a.employeeId, arr);
    }

    const enrollments = await this.prisma.workScheduleEnrollment.findMany({
      where: { employeeId: { in: employeeIds }, effectiveFrom: { lte: endDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: startDate } }] },
      orderBy: { effectiveFrom: 'desc' },
      include: { schedule: { include: { phases: { orderBy: { phaseOrder: 'asc' }, include: { shift: true } } } } },
    });
    const enrollByEmp = new Map<string, typeof enrollments>();
    for (const en of enrollments) {
      if (!en.employeeId) continue;
      const arr = enrollByEmp.get(en.employeeId) ?? [];
      arr.push(en);
      enrollByEmp.set(en.employeeId, arr);
    }

    const existing = await this.prisma.attendanceRecord.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: startDate, lte: endDate } },
    });
    const existingMap = new Map<string, (typeof existing)[number]>();
    for (const r of existing) existingMap.set(`${r.employeeId}_${dateKey(r.date)}`, r);

    // Resolve ca cho 1 NV vào 1 ngày (in-memory, mirror workShifts.resolveShiftForDate)
    const resolveShift = (empId: string, d: Date): any | null => {
      const enrs = enrollByEmp.get(empId);
      if (enrs) {
        const en = enrs.find(
          (x) => x.effectiveFrom <= d && (!x.effectiveTo || x.effectiveTo >= d) && (x.schedule?.phases?.length ?? 0) > 0,
        );
        if (en?.schedule) {
          const phases = en.schedule.phases;
          const total = phases.length;
          const start = new Date(en.effectiveFrom).getTime();
          const cur = d.getTime();
          let idx = 0;
          if (en.schedule.repeatType === 'WEEKLY') idx = Math.floor((cur - start) / (86400000 * 7));
          else if (en.schedule.repeatType === 'DAILY') idx = Math.floor((cur - start) / 86400000);
          else idx = (d.getFullYear() - new Date(en.effectiveFrom).getFullYear()) * 12 + (d.getMonth() - new Date(en.effectiveFrom).getMonth());
          idx = ((idx % total) + total) % total;
          return phases[idx].shift;
        }
      }
      const asg = assignByEmp.get(empId);
      const a = asg?.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || x.effectiveTo >= d));
      return a?.shift ?? null;
    };

    // ─── BUILD: dựng AttendanceRecord từ giờ quẹt cho từng NV × từng ngày ───────
    // Giờ vào = MIN, giờ ra = MAX các lần quẹt trong cửa sổ ca (xử lý ca đêm).
    const recordUpserts: any[] = [];
    for (const empId of employeeIds) {
      const empPunches = punchesByEmp.get(empId) ?? [];
      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(Date.UTC(year, month - 1, day)); // UTC-midnight → @db.Date đúng ngày lịch
        const key = `${empId}_${dateKey(d)}`;
        const decision = this.computeDayDecision({
          year, month, day,
          shift: resolveShift(empId, d),
          empPunches,
          leave: leaveMap.get(key),
          isHoliday: holidaySet.has(dateKey(d)),
          prevIsManual: existingMap.get(key)?.isManual ?? false,
        });
        if (decision.action === 'upsert') {
          recordUpserts.push(
            this.prisma.attendanceRecord.upsert({
              where: { employeeId_date: { employeeId: empId, date: d } },
              create: { employeeId: empId, date: d, ...decision.data },
              update: decision.data,
            }),
          );
        }
        // skip (ngày off) / preserve (record nhập tay) → không ghi đè
      }
    }

    // Ghi AttendanceRecord theo lô (tránh transaction quá lớn)
    const RECORD_CHUNK = 200;
    for (let i = 0; i < recordUpserts.length; i += RECORD_CHUNK) {
      await this.prisma.$transaction(recordUpserts.slice(i, i + RECORD_CHUNK));
    }

    // Tổng hợp tháng + sync timesheet — đọc lại từ records đã dựng (nguồn sự thật)
    await this.aggregateAndPersistMonth(employeeIds, year, month);

    return {
      message: `Đã dựng ${recordUpserts.length} ngày công từ giờ quẹt và tổng hợp bảng công cho ${employees.length} nhân viên`,
      year,
      month,
      updated: employees.length,
      recordsBuilt: recordUpserts.length,
    };
  }

  // ─── Tính lại 1 NV × 1 ngày từ giờ quẹt (dùng cho cơ chế tự động khi thêm quẹt) ──
  async recomputeEmployeeDay(employeeId: string, dateISO: string): Promise<void> {
    const base = new Date(dateISO);
    const year = base.getUTCFullYear();
    const month = base.getUTCMonth() + 1;
    const day = base.getUTCDate();
    const d = new Date(Date.UTC(year, month - 1, day));

    const shift = await this.workShiftsService.resolveShiftForDate(employeeId, d);

    // Gom giờ quẹt trong cửa sổ ca (chỉ query khi có ca hợp lệ)
    let empPunches: Date[] = [];
    if (shift && (shift as any).type !== 'CA_OFF') {
      const [winStart, winEnd] = this.buildShiftWindow(year, month, day, (shift as any).startTime, (shift as any).endTime);
      const punches = await this.prisma.attendancePunch.findMany({
        where: { employeeId, punchedAt: { gte: winStart, lte: winEnd } },
        select: { punchedAt: true },
        orderBy: { punchedAt: 'asc' },
      });
      empPunches = punches.map((p) => p.punchedAt);
    }

    const leaveReq = await this.prisma.leaveRequest.findFirst({
      where: { employeeId, status: 'APPROVED', startDate: { lte: d }, endDate: { gte: d } },
      include: { leaveType: { select: { isPaid: true } } },
    });
    const leave = leaveReq
      ? {
          isPaid: leaveReq.leaveType?.isPaid ?? true,
          half:
            new Date(leaveReq.startDate as Date).toISOString().slice(0, 10) ===
              new Date(leaveReq.endDate as Date).toISOString().slice(0, 10) && Number(leaveReq.days) === 0.5,
        }
      : undefined;

    const holiday = await this.prisma.holidayCalendar.findFirst({ where: { date: d } });
    const prev = await this.prisma.attendanceRecord.findFirst({ where: { employeeId, date: d } });

    const decision = this.computeDayDecision({
      year, month, day, shift, empPunches, leave, isHoliday: !!holiday, prevIsManual: prev?.isManual ?? false,
    });
    if (decision.action === 'upsert') {
      await this.prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId, date: d } },
        create: { employeeId, date: d, ...decision.data },
        update: decision.data,
      });
    }
    // preserve/skip → giữ nguyên record hiện có

    await this.aggregateAndPersistMonth([employeeId], year, month);
  }

  // ─── Quyết định bản ghi 1 ngày từ giờ quẹt (logic dùng chung batch + granular) ──
  private computeDayDecision(p: {
    year: number; month: number; day: number;
    shift: any | null;
    empPunches: Date[];
    leave?: { isPaid: boolean; half: boolean };
    isHoliday: boolean;
    prevIsManual: boolean;
  }): { action: 'skip' } | { action: 'preserve' } | { action: 'upsert'; data: any } {
    const { year, month, day, shift, empPunches, leave, isHoliday, prevIsManual } = p;

    // Ngày off → bỏ qua: chưa phân ca / CA_OFF / thứ không thuộc workingDays
    if (!shift || shift.type === 'CA_OFF') return { action: 'skip' };
    const dUTC = new Date(Date.UTC(year, month - 1, day));
    const isoDow = dUTC.getUTCDay() === 0 ? 7 : dUTC.getUTCDay();
    const workingDays: number[] = shift.workingDays?.length ? shift.workingDays : [1, 2, 3, 4, 5];
    if (!workingDays.includes(isoDow)) return { action: 'skip' };

    const plannedStart: string = shift.startTime;
    const plannedEnd: string = shift.endTime;

    const [winStart, winEnd] = this.buildShiftWindow(year, month, day, plannedStart, plannedEnd);
    const dayPunches = empPunches
      .filter((pp) => pp >= winStart && pp <= winEnd)
      .sort((a, b) => a.getTime() - b.getTime());
    const checkIn = dayPunches.length ? dayPunches[0] : null;
    const checkOut = dayPunches.length > 1 ? dayPunches[dayPunches.length - 1] : null;

    let baseStatus: AttendanceStatus = AttendanceStatus.PRESENT;
    const anomalies: AttendanceAnomaly[] = [];
    let dayCredit = 0;
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;
    let leaveTypeFlag: string | null = null;

    if (leave) {
      // Nghỉ phép: có lương=1 / nửa ngày=0.5 / không lương=0
      baseStatus = AttendanceStatus.LEAVE;
      leaveTypeFlag = leave.isPaid ? null : 'UNPAID';
      dayCredit = leave.isPaid ? (leave.half ? 0.5 : 1) : 0;
    } else if (isHoliday) {
      baseStatus = AttendanceStatus.HOLIDAY;
    } else if (!checkIn) {
      // Không có quẹt → bảo toàn record nhập tay (sửa/giải trình), còn lại = vắng
      if (prevIsManual) return { action: 'preserve' };
      baseStatus = AttendanceStatus.ABSENT;
    } else {
      baseStatus = AttendanceStatus.PRESENT;
      if (!checkOut) {
        anomalies.push(AttendanceAnomaly.MISSING_CHECKOUT);
        dayCredit = 0; // thiếu giờ ra → chờ giải trình
      } else {
        const m = this.calculateShiftMetrics(checkIn, checkOut, plannedStart, plannedEnd);
        dayCredit = Math.round(m.dayCredit * 100) / 100;
        lateMinutes = m.lateMinutes;
        earlyLeaveMinutes = m.earlyLeaveMinutes;
        overtimeMinutes = m.overtimeMinutes;
        if (lateMinutes > 0) anomalies.push(AttendanceAnomaly.LATE_ARRIVAL);
        if (earlyLeaveMinutes > 0) anomalies.push(AttendanceAnomaly.EARLY_DEPARTURE);
      }
    }

    const totalHours = checkIn && checkOut
      ? Math.round(((checkOut.getTime() - checkIn.getTime()) / 3_600_000) * 100) / 100
      : 0;

    return {
      action: 'upsert',
      data: {
        shiftId: shift.id ?? undefined,
        checkIn, checkOut, plannedStart, plannedEnd, totalHours,
        dayCredit, status: baseStatus, anomalies, leaveType: leaveTypeFlag,
        lateMinutes, earlyLeaveMinutes, overtimeMinutes, isManual: false,
      },
    };
  }

  // ─── Tổng hợp MonthlyAttendance + sync TimesheetRecord từ records đã lưu ────────
  private async aggregateAndPersistMonth(employeeIds: string[], year: number, month: number): Promise<void> {
    if (employeeIds.length === 0) return;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: startDate, lte: endDate } },
      select: { employeeId: true, status: true, dayCredit: true, overtimeMinutes: true, leaveType: true },
    });
    const byEmp = new Map<string, typeof records>();
    for (const r of records) {
      const a = byEmp.get(r.employeeId) ?? [];
      a.push(r);
      byEmp.set(r.employeeId, a);
    }

    const r1 = (n: number) => Math.round(n * 10) / 10;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const upserts = employeeIds.map((empId) => {
      let workDays = 0, paidLeaveDays = 0, unpaidLeaveDays = 0, otHours = 0, absentDays = 0, holidayDays = 0;
      for (const r of byEmp.get(empId) ?? []) {
        const dc = r.dayCredit != null ? Number(r.dayCredit) : 0;
        if (r.status === AttendanceStatus.PRESENT) { workDays += dc; otHours += (r.overtimeMinutes ?? 0) / 60; }
        else if (r.status === AttendanceStatus.LEAVE) {
          if (r.leaveType === 'UNPAID') unpaidLeaveDays += 1;
          else paidLeaveDays += dc > 0 ? dc : 1;
        } else if (r.status === AttendanceStatus.ABSENT) absentDays += 1;
        else if (r.status === AttendanceStatus.HOLIDAY) holidayDays += 1;
      }
      const agg = {
        workDays: r1(workDays), paidLeaveDays: r1(paidLeaveDays), unpaidLeaveDays: r1(unpaidLeaveDays),
        otHours: r2(otHours), absentDays: r1(absentDays), holidayDays: r1(holidayDays),
      };
      return this.prisma.monthlyAttendance.upsert({
        where: { employeeId_year_month: { employeeId: empId, year, month } },
        create: { employeeId: empId, year, month, ...agg, status: MonthlyAttendanceStatus.OPEN },
        update: agg,
      });
    });

    const CHUNK = 200;
    const monthlyResults: any[] = [];
    for (let i = 0; i < upserts.length; i += CHUNK) {
      monthlyResults.push(...(await this.prisma.$transaction(upserts.slice(i, i + CHUNK))));
    }

    // E16F.2 — sync TimesheetRecord (chỉ NV có account User)
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    const employeesWithUser = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds }, userId: { not: null } },
      select: { id: true, userId: true },
    });
    const empToUser = new Map(employeesWithUser.map((e) => [e.id, e.userId as string]));

    const timesheetSyncs = monthlyResults
      .filter((m: any) => empToUser.has(m.employeeId))
      .map((m: any) => {
        const userId = empToUser.get(m.employeeId)!;
        return this.prisma.timesheetRecord.upsert({
          where: { userId_periodStart: { userId, periodStart } },
          create: {
            userId, periodStart, periodEnd,
            workingDays: m.workDays, leaveDays: m.paidLeaveDays, unpaidLeaveDays: m.unpaidLeaveDays,
            standardDays: 0, overtimeHours: m.otHours, status: TimesheetStatus.APPROVED,
          },
          update: {
            workingDays: m.workDays, leaveDays: m.paidLeaveDays, unpaidLeaveDays: m.unpaidLeaveDays,
            status: TimesheetStatus.APPROVED,
          },
        });
      });
    for (let i = 0; i < timesheetSyncs.length; i += CHUNK) {
      await this.prisma.$transaction(timesheetSyncs.slice(i, i + CHUNK));
    }
  }

  // ─── Cửa sổ thời gian gom giờ quẹt của 1 ca trong 1 ngày (giờ địa phương) ────
  // Ca ngày: [start−tol, end+tol]. Ca đêm (end ≤ start): giờ ra vắt sang hôm sau →
  // cộng 24h. Dùng local-midnight (new Date(y,m,d,0,0,0)) để khớp giờ quẹt thực tế.
  private buildShiftWindow(year: number, month: number, day: number, start: string, end: string): [Date, Date] {
    const TOL_BEFORE_MIN = 180; // quẹt sớm trước giờ vào
    const TOL_AFTER_MIN = 360; // quẹt muộn sau giờ tan ca (gồm OT)
    const toMin = (t: string) => {
      const [h, m] = (t ?? '').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const startMin = toMin(start);
    const endMin = toMin(end);
    const base = new Date(year, month - 1, day, 0, 0, 0, 0).getTime(); // 00:00 giờ địa phương
    const overnight = endMin <= startMin;
    const winStart = new Date(base + (startMin - TOL_BEFORE_MIN) * 60_000);
    const winEnd = new Date(base + (endMin + (overnight ? 1440 : 0) + TOL_AFTER_MIN) * 60_000);
    return [winStart, winEnd];
  }

  // ─── 5. Khóa bảng công tháng ─────────────────────────────────────────────────
  async lockMonth(dto: LockMonthDto, userId: string) {
    const { year, month, orgUnitId } = dto;

    const where: any = { year, month };
    if (orgUnitId) {
      where.employee = { orgUnitId };
    }

    // Kiểm tra xem có bản ghi nào đã bị khóa chưa
    const records = await this.prisma.monthlyAttendance.findMany({ where });

    if (records.length === 0) {
      return { message: 'Không có bản ghi bảng công nào để khóa', locked: 0 };
    }

    const alreadyLocked = records.filter(
      (r) => r.status === MonthlyAttendanceStatus.LOCKED,
    );
    if (alreadyLocked.length === records.length) {
      throw new ForbiddenException('Tất cả bảng công đã được khóa');
    }

    const updates = records
      .filter((r) => r.status !== MonthlyAttendanceStatus.LOCKED)
      .map((r) =>
        this.prisma.monthlyAttendance.update({
          where: { id: r.id },
          data: {
            status: MonthlyAttendanceStatus.LOCKED,
            lockedAt: new Date(),
            lockedById: userId,
          },
        }),
      );

    await this.prisma.$transaction(updates);

    return {
      message: `Đã khóa ${updates.length} bảng công`,
      year,
      month,
      locked: updates.length,
    };
  }

  // ─── 6. Báo cáo bảng công tháng ─────────────────────────────────────────────
  async getMonthlyReport(query: MonthlyAttendanceQueryDto): Promise<PaginatedResult<any>> {
    const page = (query as any).page ?? 1;
    const limit = (query as any).limit ?? 100;

    const where: any = {};
    if (query.year) where.year = query.year;
    if (query.month) where.month = query.month;
    if (query.orgUnitId) {
      where.employee = { orgUnitId: query.orgUnitId };
    }

    const [records, total] = await this.prisma.$transaction([
      this.prisma.monthlyAttendance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { employeeId: 'asc' }],
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              code: true,
              orgUnitId: true,
              orgUnit: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.monthlyAttendance.count({ where }),
    ]);

    return paginate(records, total, page, limit);
  }
}
