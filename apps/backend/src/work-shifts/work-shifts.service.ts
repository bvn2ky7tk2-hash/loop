import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';
import {
  CreateWorkShiftDto,
  UpdateWorkShiftDto,
  CreateShiftAssignmentDto,
  ListShiftAssignmentDto,
  CreateWorkScheduleTemplateDto,
  EnrollEmployeesDto,
  ListScheduleTemplateDto,
  SwapShiftDto,
  RecalculateDto,
} from './dto/work-shift.dto';

@Injectable()
export class WorkShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. Danh sách tất cả ca làm việc ────────────────────────────────────────
  async findAllShifts() {
    return this.prisma.workShift.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── 2. Tạo ca làm việc mới ─────────────────────────────────────────────────
  async createShift(dto: CreateWorkShiftDto) {
    return this.prisma.workShift.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        type: dto.type as any,
        startTime: dto.startTime,
        endTime: dto.endTime,
        breakMinutes: dto.breakMinutes,
        description: dto.description ?? null,
      },
    });
  }

  // ─── 3. Cập nhật ca làm việc ────────────────────────────────────────────────
  async updateShift(id: string, dto: UpdateWorkShiftDto) {
    const shift = await this.prisma.workShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm việc');

    return this.prisma.workShift.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code.toUpperCase() }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.breakMinutes !== undefined && { breakMinutes: dto.breakMinutes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  // ─── 4. Xóa ca làm việc (kiểm tra không có assignment đang active) ──────────
  async deleteShift(id: string) {
    const shift = await this.prisma.workShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm việc');

    const activeAssignmentCount = await this.prisma.shiftAssignment.count({
      where: {
        shiftId: id,
        effectiveTo: null,
      },
    });

    if (activeAssignmentCount > 0) {
      throw new BadRequestException(
        `Không thể xóa ca làm việc đang được áp dụng cho ${activeAssignmentCount} nhân viên`,
      );
    }

    return this.prisma.workShift.delete({ where: { id } });
  }

  // ─── 5. Danh sách phân công ca (paginated) ───────────────────────────────────
  async listAssignments(query: ListShiftAssignmentDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: any = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.shiftId) where.shiftId = query.shiftId;

    // Lọc assignment có hiệu lực tại ngày `date`
    if (query.date) {
      const targetDate = new Date(query.date);
      where.effectiveFrom = { lte: targetDate };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }];
    }

    const [assignments, total] = await this.prisma.$transaction([
      this.prisma.shiftAssignment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { effectiveFrom: 'desc' },
        include: {
          employee: {
            select: {
              id: true, fullName: true, code: true, orgUnitId: true,
              orgUnit:  { select: { id: true, name: true, code: true } },
              position: { include: { jobTitle: { select: { id: true, name: true } } } },
            },
          },
          shift: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      }),
      this.prisma.shiftAssignment.count({ where }),
    ]);

    return paginate(assignments, total, page, limit);
  }

  // ─── 6. Tạo phân công ca làm việc ───────────────────────────────────────────
  async createAssignment(dto: CreateShiftAssignmentDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    const shift = await this.prisma.workShift.findUnique({
      where: { id: dto.shiftId },
    });
    if (!shift) throw new NotFoundException('Không tìm thấy ca làm việc');

    const effectiveFrom = new Date(dto.effectiveFrom);

    // Nếu không có effectiveTo, tự động đóng assignment active hiện tại
    if (!dto.effectiveTo) {
      const prevActive = await this.prisma.shiftAssignment.findFirst({
        where: {
          employeeId: dto.employeeId,
          effectiveTo: null,
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (prevActive) {
        // Đặt effectiveTo = effectiveFrom - 1 ngày
        const closedDate = new Date(effectiveFrom);
        closedDate.setDate(closedDate.getDate() - 1);

        await this.prisma.shiftAssignment.update({
          where: { id: prevActive.id },
          data: { effectiveTo: closedDate },
        });
      }
    }

    return this.prisma.shiftAssignment.create({
      data: {
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        effectiveFrom,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        note: dto.note ?? null,
      },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
        shift: { select: { id: true, name: true, code: true, type: true } },
      },
    });
  }

  // ─── 7. Xóa phân công ca ────────────────────────────────────────────────────
  async deleteAssignment(id: string) {
    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy phân công ca');

    return this.prisma.shiftAssignment.delete({ where: { id } });
  }

  // ─── 8. Lấy ca làm việc active của nhân viên tại ngày cụ thể ────────────────
  async getActiveShift(employeeId: string, date: Date) {
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        shift: true,
      },
    });

    return assignment?.shift ?? null;
  }

  // ─── Lịch làm việc xoay ca (template-based) ─────────────────────────────────

  async createScheduleTemplate(dto: CreateWorkScheduleTemplateDto) {
    return this.prisma.workSchedule.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        repeatType: dto.repeatType as any,
        isActive: true,
        phases: {
          create: dto.phases.map((p) => ({
            shiftId: p.shiftId ?? null,
            phaseOrder: p.phaseOrder,
          })),
        },
      },
      include: {
        phases: {
          orderBy: { phaseOrder: 'asc' },
          include: { shift: { select: { id: true, name: true, code: true, type: true, startTime: true, endTime: true } } },
        },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async listScheduleTemplates(query: ListScheduleTemplateDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: any = {};
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workSchedule.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          phases: {
            orderBy: { phaseOrder: 'asc' },
            include: { shift: { select: { id: true, name: true, code: true, type: true, startTime: true, endTime: true } } },
          },
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.workSchedule.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async deleteScheduleTemplate(id: string) {
    const schedule = await this.prisma.workSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch làm việc');
    return this.prisma.workSchedule.delete({ where: { id } });
  }

  async enrollEmployees(scheduleId: string, dto: EnrollEmployeesDto) {
    const schedule = await this.prisma.workSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch làm việc');

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const rows: any[] = [];

    if (dto.employeeIds?.length) {
      for (const employeeId of dto.employeeIds) {
        const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!emp) throw new NotFoundException(`Không tìm thấy nhân viên ${employeeId}`);
        rows.push({ scheduleId, employeeId, effectiveFrom, effectiveTo, note: dto.note ?? null });
      }
    }

    if (dto.orgUnitId) {
      rows.push({ scheduleId, orgUnitId: dto.orgUnitId, effectiveFrom, effectiveTo, note: dto.note ?? null });
    }

    if (!rows.length) throw new BadRequestException('Cần chọn ít nhất 1 nhân viên hoặc phòng ban');

    return this.prisma.workScheduleEnrollment.createMany({ data: rows, skipDuplicates: true });
  }

  async listEnrollments(scheduleId: string) {
    return this.prisma.workScheduleEnrollment.findMany({
      where: { scheduleId },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
      },
    });
  }

  async removeEnrollment(enrollmentId: string) {
    const e = await this.prisma.workScheduleEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!e) throw new NotFoundException('Không tìm thấy đăng ký lịch làm việc');
    return this.prisma.workScheduleEnrollment.delete({ where: { id: enrollmentId } });
  }

  // Tìm ca làm việc động cho nhân viên tại ngày cụ thể (qua enrollment)
  async resolveShiftForDate(employeeId: string, date: Date) {
    const dateMidnight = new Date(date);
    dateMidnight.setHours(0, 0, 0, 0);

    // Tìm enrollment cá nhân của nhân viên này
    const enrollment = await this.prisma.workScheduleEnrollment.findFirst({
      where: {
        employeeId,
        effectiveFrom: { lte: dateMidnight },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateMidnight } }],
      },
      orderBy: { effectiveFrom: 'desc' },
      include: {
        schedule: {
          include: {
            phases: {
              orderBy: { phaseOrder: 'asc' },
              include: { shift: true },
            },
          },
        },
      },
    });

    const schedule = enrollment?.schedule ?? null;

    if (!schedule || !schedule.phases.length) {
      return this.getActiveShift(employeeId, date);
    }

    const totalPhases = schedule.phases.length;
    const startDate = new Date(enrollment!.effectiveFrom);
    startDate.setHours(0, 0, 0, 0);

    let phaseIndex = 0;
    if (schedule.repeatType === 'DAILY') {
      const diff = Math.floor((dateMidnight.getTime() - startDate.getTime()) / 86400000);
      phaseIndex = ((diff % totalPhases) + totalPhases) % totalPhases;
    } else if (schedule.repeatType === 'WEEKLY') {
      const diff = Math.floor((dateMidnight.getTime() - startDate.getTime()) / (86400000 * 7));
      phaseIndex = ((diff % totalPhases) + totalPhases) % totalPhases;
    } else {
      const diff = (dateMidnight.getFullYear() - startDate.getFullYear()) * 12
        + (dateMidnight.getMonth() - startDate.getMonth());
      phaseIndex = ((diff % totalPhases) + totalPhases) % totalPhases;
    }

    return schedule.phases[phaseIndex].shift;
  }

  /**
   * Kiểm tra ngày `date` có phải ca nghỉ (CA_OFF) của nhân viên không.
   *
   * Thứ tự ưu tiên:
   * 1. Lấy ca từ lịch xoay / assignment → nếu type = CA_OFF → true
   * 2. Không có cấu hình ca nào → mặc định T7/CN là nghỉ
   */
  async isOffDay(employeeId: string, date: Date): Promise<boolean> {
    const shift = await this.resolveShiftForDate(employeeId, date);

    // Có cấu hình ca rõ ràng → chỉ off khi type = CA_OFF
    if (shift !== null) {
      return (shift as { type: string } | null)?.type === 'CA_OFF';
    }

    // Không có ca nào được phân công → coi là ngày nghỉ
    // (không fallback Mon-Fri: chưa có ca thì không được tính công)
    return true;
  }

  async swapShift(dto: SwapShiftDto) {
    const shift = await this.prisma.workShift.findUnique({ where: { id: dto.newShiftId } });
    if (!shift) throw new NotFoundException('Ca làm việc không tồn tại');

    const results = await Promise.all(
      dto.dates.map(async (dateStr) => {
        const date = new Date(dateStr);
        return this.prisma.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId: dto.employeeId, date } },
          create: {
            employeeId: dto.employeeId,
            date,
            shiftId: dto.newShiftId,
            plannedStart: shift.startTime,
            plannedEnd: shift.endTime,
            status: 'PRESENT' as any,
            isManual: true,
            note: dto.reason ?? 'Đổi ca nhanh',
          },
          update: {
            shiftId: dto.newShiftId,
            plannedStart: shift.startTime,
            plannedEnd: shift.endTime,
            isManual: true,
            note: dto.reason ?? 'Đổi ca nhanh',
          },
        });
      }),
    );

    return { updated: results.length };
  }

  async recalculateAttendance(dto: RecalculateDto) {
    const startOfMonth = new Date(dto.year, dto.month - 1, 1);
    const endOfMonth = new Date(dto.year, dto.month, 0, 23, 59, 59);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId: dto.employeeId,
        date: { gte: startOfMonth, lte: endOfMonth },
        checkIn: { not: null },
        checkOut: { not: null },
      },
    });

    let updated = 0;
    for (const record of records) {
      let plannedStart = record.plannedStart;
      let plannedEnd = record.plannedEnd;

      if (!plannedStart || !plannedEnd) {
        const resolvedShift = await this.resolveShiftForDate(dto.employeeId, record.date);
        if (resolvedShift) {
          plannedStart = resolvedShift.startTime;
          plannedEnd = resolvedShift.endTime;
        }
      }

      if (!plannedStart || !plannedEnd || !record.checkIn || !record.checkOut) continue;

      const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const ps = toMin(plannedStart);
      const pe = toMin(plannedEnd);
      const ci = record.checkIn.getHours() * 60 + record.checkIn.getMinutes();
      const co = record.checkOut.getHours() * 60 + record.checkOut.getMinutes();
      const adjPe = pe < ps ? pe + 1440 : pe;
      const adjCo = co < ci ? co + 1440 : co;

      const lateMinutes = Math.max(0, ci - ps);
      const earlyLeaveMinutes = Math.max(0, adjPe - adjCo);
      const overtimeMinutes = Math.max(0, adjCo - adjPe);

      await this.prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { lateMinutes, earlyLeaveMinutes, overtimeMinutes, plannedStart, plannedEnd },
      });
      updated++;
    }

    return { updated, total: records.length };
  }
}
