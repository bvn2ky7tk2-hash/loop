import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollStatus } from '../generated/prisma';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { FinanceEventBus } from '../accounting/finance-event-bus.service';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeEventBus: FinanceEventBus,
  ) {}

  // ── List kỳ lương ──────────────────────────────────────────────────────────
  async listPeriods(page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payrollPeriod.findMany({
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          processedBy: { select: { id: true, name: true } },
          _count: { select: { records: true } },
        },
      }),
      this.prisma.payrollPeriod.count(),
    ]);

    return paginate(data, total, page, limit);
  }

  // ── Tạo kỳ lương mới ───────────────────────────────────────────────────────
  async createPeriod(dto: CreatePayrollPeriodDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('endDate phải sau startDate');
    }

    return this.prisma.payrollPeriod.create({
      data: {
        name: dto.name,
        startDate: start,
        endDate: end,
        status: PayrollStatus.DRAFT,
      },
    });
  }

  // ── Tính lương cho toàn bộ nhân viên active trong kỳ ─────────────────────
  async generatePayroll(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);

    if (period.status === PayrollStatus.APPROVED || period.status === PayrollStatus.PAID) {
      throw new BadRequestException('Không thể tính lại kỳ lương đã duyệt hoặc đã trả');
    }

    // Lấy tất cả nhân viên active (có userId — tức đang làm việc)
    const employees = await this.prisma.employee.findMany({
      where: { userId: { not: null } },
      select: { id: true, userId: true },
    });

    const upsertResults: any[] = [];

    for (const emp of employees) {
      // 1. Lấy TimesheetRecord trong period
      const timesheet = await this.prisma.timesheetRecord.findFirst({
        where: {
          userId: emp.userId!,
          periodStart: { lte: period.endDate },
          periodEnd: { gte: period.startDate },
        },
        orderBy: { periodStart: 'desc' },
      });

      const workingDays = timesheet ? Number(timesheet.workingDays) : 0;
      const overtimeHours = timesheet ? Number(timesheet.overtimeHours) : 0;
      const leaveDays = timesheet ? Number(timesheet.leaveDays) : 0;

      // 2. Lấy EmployeeRate hiệu lực (effectiveDate <= endDate, mới nhất)
      const rate = await this.prisma.employeeRate.findFirst({
        where: {
          employeeId: emp.id,
          effectiveDate: { lte: period.endDate },
        },
        orderBy: { effectiveDate: 'desc' },
      });

      const ratePerDay = rate ? Number(rate.ratePerDay) : 0;

      // 3. Tính lương
      const baseSalary = workingDays * ratePerDay;
      // netSalary mặc định = baseSalary; bonus/deductions có thể update sau
      const netSalary = baseSalary;

      // 4. Upsert PayrollRecord
      const record = await this.prisma.payrollRecord.upsert({
        where: {
          periodId_employeeId: { periodId, employeeId: emp.id },
        },
        create: {
          periodId,
          employeeId: emp.id,
          workDays: workingDays,
          leaveDays,
          overtimeHours,
          baseSalary,
          deductions: 0,
          bonus: 0,
          netSalary,
        },
        update: {
          workDays: workingDays,
          leaveDays,
          overtimeHours,
          baseSalary,
          netSalary,
        },
      });

      upsertResults.push(record);
    }

    // 5. Update period status → PROCESSING
    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollStatus.PROCESSING },
    });

    return {
      periodId,
      generated: upsertResults.length,
      status: PayrollStatus.PROCESSING,
    };
  }

  // ── Danh sách bản ghi lương theo kỳ ───────────────────────────────────────
  async getPeriodRecords(periodId: string, page = 1, limit = 50): Promise<PaginatedResult<any>> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payrollRecord.findMany({
        where: { periodId },
        include: {
          employee: {
            select: {
              id: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { employee: { user: { name: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payrollRecord.count({ where: { periodId } }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ── Cập nhật bonus / deductions / note của một bản ghi ────────────────────
  async updateRecord(recordId: string, dto: UpdatePayrollRecordDto) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException(`PayrollRecord ${recordId} không tìm thấy`);

    const bonus = dto.bonus !== undefined ? dto.bonus : Number(record.bonus);
    const deductions = dto.deductions !== undefined ? dto.deductions : Number(record.deductions);
    // Tính lại netSalary
    const netSalary = Number(record.baseSalary) - deductions + bonus;

    return this.prisma.payrollRecord.update({
      where: { id: recordId },
      data: {
        ...(dto.bonus !== undefined ? { bonus: dto.bonus } : {}),
        ...(dto.deductions !== undefined ? { deductions: dto.deductions } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        netSalary,
      },
    });
  }

  // ── Phê duyệt kỳ lương ─────────────────────────────────────────────────────
  async approvePeriod(periodId: string, userId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);

    if (period.status !== PayrollStatus.PROCESSING) {
      throw new BadRequestException('Chỉ có thể phê duyệt kỳ lương ở trạng thái PROCESSING');
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.APPROVED,
        processedById: userId,
        processedAt: new Date(),
      },
      include: { records: { select: { baseSalary: true } } },
    });

    const totalSalary = updated.records.reduce((s, r) => s + Number(r.baseSalary), 0);
    this.financeEventBus.emit({
      type: 'payroll.approved',
      refId: periodId,
      amount: totalSalary,
      userId,
    });
    return updated;
  }

  // ── Đánh dấu đã thanh toán ─────────────────────────────────────────────────
  async markPaid(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);

    if (period.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Chỉ có thể đánh dấu đã trả với kỳ lương đã APPROVED');
    }

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollStatus.PAID },
    });
  }
}
