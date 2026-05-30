import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
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
import { AttendanceStatus, MonthlyAttendanceStatus, TimesheetStatus } from '../generated/prisma';
import { WorkShiftsService } from '../work-shifts/work-shifts.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class HrAttendanceService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workShiftsService: WorkShiftsService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ─── Tính toán chỉ số ca làm việc từ giờ check-in/out thực tế ───────────────
  calculateShiftMetrics(
    checkIn: Date,
    checkOut: Date,
    plannedStart: string,
    plannedEnd: string,
  ): { lateMinutes: number; earlyLeaveMinutes: number; overtimeMinutes: number } {
    const toMinutes = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const plannedStartMinutes = toMinutes(plannedStart);
    const plannedEndMinutes = toMinutes(plannedEnd);

    // Tính phút từ nửa đêm của ngày làm việc
    const checkInHour = checkIn.getHours();
    const checkInMin = checkIn.getMinutes();
    const checkInMinutes = checkInHour * 60 + checkInMin;

    const checkOutHour = checkOut.getHours();
    const checkOutMin = checkOut.getMinutes();
    const checkOutMinutes = checkOutHour * 60 + checkOutMin;

    // Xử lý ca đêm (plannedEnd < plannedStart — ca vắt qua ngày mới)
    const adjustedPlannedEnd =
      plannedEndMinutes < plannedStartMinutes
        ? plannedEndMinutes + 24 * 60
        : plannedEndMinutes;
    const adjustedCheckOut =
      checkOutMinutes < checkInMinutes
        ? checkOutMinutes + 24 * 60
        : checkOutMinutes;

    const lateMinutes = Math.max(0, checkInMinutes - plannedStartMinutes);
    const earlyLeaveMinutes = Math.max(0, adjustedPlannedEnd - adjustedCheckOut);
    const overtimeMinutes = Math.max(0, adjustedCheckOut - adjustedPlannedEnd);

    return { lateMinutes, earlyLeaveMinutes, overtimeMinutes };
  }

  // ─── 1. List bản ghi chấm công (paginated) ──────────────────────────────────
  async list(query: AttendanceQueryDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: any = this.tenantWhere();
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
            select: { id: true, fullName: true, code: true, orgUnitId: true },
          },
        },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

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

        const metrics = this.calculateShiftMetrics(
          checkInTime,
          checkOutTime,
          activeShift.startTime,
          activeShift.endTime,
        );
        lateMinutes = metrics.lateMinutes;
        earlyLeaveMinutes = metrics.earlyLeaveMinutes;
        overtimeMinutes = metrics.overtimeMinutes;

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
    }

    const data: any = {
      employeeId: dto.employeeId,
      date,
      checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
      checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      totalHours,
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

    // Lấy tất cả bản ghi chấm công trong tháng
    const allRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        date: { gte: startDate, lte: endDate },
      },
    });

    const upserts = employees.map((emp) => {
      const records = allRecords.filter((r) => r.employeeId === emp.id);

      const workDays = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
      const paidLeaveDays = records.filter(
        (r) => r.status === AttendanceStatus.LEAVE && r.leaveType !== 'UNPAID',
      ).length;
      const unpaidLeaveDays = records.filter(
        (r) => r.status === AttendanceStatus.LEAVE && r.leaveType === 'UNPAID',
      ).length;
      const otHours = records
        .filter((r) => r.status === AttendanceStatus.OT)
        .reduce((sum, r) => sum + Number(r.totalHours ?? 0), 0);
      const absentDays = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
      const holidayDays = records.filter((r) => r.status === AttendanceStatus.HOLIDAY).length;

      return this.prisma.monthlyAttendance.upsert({
        where: {
          employeeId_year_month: {
            employeeId: emp.id,
            year,
            month,
          },
        },
        create: {
          employeeId: emp.id,
          year,
          month,
          workDays,
          paidLeaveDays,
          unpaidLeaveDays,
          otHours,
          absentDays,
          holidayDays,
          status: MonthlyAttendanceStatus.OPEN,
        },
        update: {
          workDays,
          paidLeaveDays,
          unpaidLeaveDays,
          otHours,
          absentDays,
          holidayDays,
        },
      });
    });

    const monthlyResults = await this.prisma.$transaction(upserts);

    // E16F.2 — Sau khi upsert MonthlyAttendance, sync sang TimesheetRecord
    // TimesheetRecord dùng userId (User), Monthly dùng employeeId (Employee)
    // Cần map employeeId → userId qua Employee.userId
    const periodStart = new Date(year, month - 1, 1);

    // Lấy userId cho từng employee có kết quả (filter out null userId)
    const employeeIds = employees.map((e) => e.id);
    const employeesWithUser = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds }, userId: { not: null } },
      select: { id: true, userId: true },
    });
    const empToUser = new Map(
      employeesWithUser.map((e) => [e.id, e.userId as string]),
    );

    // Upsert TimesheetRecord cho từng nhân viên có account User
    const timesheetSyncs = monthlyResults
      .filter((m: any) => empToUser.has(m.employeeId))
      .map((m: any) => {
        const userId = empToUser.get(m.employeeId)!;
        return this.prisma.timesheetRecord.upsert({
          where: { userId_periodStart: { userId, periodStart } },
          create: {
            userId,
            periodStart,
            periodEnd: new Date(year, month, 0), // cuối tháng
            workingDays: m.workDays,
            leaveDays: m.paidLeaveDays,
            unpaidLeaveDays: m.unpaidLeaveDays,
            standardDays: 0, // sẽ được tính lại khi generatePeriod
            overtimeHours: m.otHours,
            status: TimesheetStatus.APPROVED,
          },
          update: {
            workingDays: m.workDays,
            leaveDays: m.paidLeaveDays,
            unpaidLeaveDays: m.unpaidLeaveDays,
            status: TimesheetStatus.APPROVED,
          },
        });
      });

    if (timesheetSyncs.length > 0) {
      await this.prisma.$transaction(timesheetSyncs);
    }

    return {
      message: `Đã tổng hợp bảng công cho ${employees.length} nhân viên`,
      year,
      month,
      updated: employees.length,
    };
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
  async getMonthlyReport(query: MonthlyAttendanceQueryDto): Promise<any[]> {
    const where: any = {};
    if (query.year) where.year = query.year;
    if (query.month) where.month = query.month;
    if (query.orgUnitId) {
      where.employee = { orgUnitId: query.orgUnitId };
    }

    return this.prisma.monthlyAttendance.findMany({
      where,
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
    });
  }
}
