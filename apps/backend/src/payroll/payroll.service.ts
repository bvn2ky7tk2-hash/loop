import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { PayrollStatus, PayrollPeriodType } from '../generated/prisma';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollRecordDto } from './dto/update-payroll-record.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { FinanceEventBus } from '../accounting/finance-event-bus.service';
import { PayrollEngineService } from './payroll-engine.service';
import { PayslipQueueService } from './payslip-queue.service';
import { StorageService } from '../storage/storage.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable({ scope: Scope.REQUEST })
export class PayrollService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeEventBus: FinanceEventBus,
    private readonly engine: PayrollEngineService,
    private readonly payslipQueue: PayslipQueueService,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  // ── List kỳ lương ──────────────────────────────────────────────────────────
  async listPeriods(page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payrollPeriod.findMany({
        orderBy: { createdAt: 'desc' },
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
        type: dto.type ?? PayrollPeriodType.REGULAR,
      },
    });
  }

  // ── Tính lương cho toàn bộ nhân viên active trong kỳ ─────────────────────
  async generatePayroll(periodId: string) {
    const { processed } = await this.engine.processPayrollPeriod(periodId);
    return { periodId, generated: processed, status: PayrollStatus.PROCESSING };
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
              code: true,
              user: { select: { id: true, name: true, email: true } },
              orgUnit:  { select: { name: true } },
              position: { select: { jobTitle: { select: { name: true } } } },
            },
          },
        },
        orderBy: { employeeId: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payrollRecord.count({ where: { periodId } }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ── Cập nhật bonus / deductions / note ────────────────────────────────────
  async updateRecord(recordId: string, dto: UpdatePayrollRecordDto) {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException(`PayrollRecord ${recordId} không tìm thấy`);

    const bonus = dto.bonus !== undefined ? dto.bonus : Number(record.bonus);
    const deductions = dto.deductions !== undefined ? dto.deductions : Number(record.deductions);
    const netSalary = Number(record.baseSalary) - deductions + bonus;

    const result = await this.prisma.payrollRecord.update({
      where: { id: recordId },
      data: {
        ...(dto.bonus !== undefined ? { bonus: dto.bonus } : {}),
        ...(dto.deductions !== undefined ? { deductions: dto.deductions } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        netSalary,
      },
    });

    // Ghi audit log — chỉnh sửa bản ghi lương
    this.auditLog.log({
      action: 'UPDATE',
      module: 'finance',
      entity: 'Payroll',
      entityId: recordId,
      oldValues: { bonus: Number(record.bonus), deductions: Number(record.deductions) },
      newValues:  { bonus: dto.bonus, deductions: dto.deductions, note: dto.note },
    }).catch(() => {});

    return result;
  }

  // ── Chuyển PROCESSING → REVIEWED ─────────────────────────────────────────
  async reviewPeriod(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);
    if (period.status !== PayrollStatus.PROCESSING) {
      throw new BadRequestException('Chỉ có thể chuyển sang REVIEWED từ trạng thái PROCESSING');
    }
    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollStatus.REVIEWED },
    });
  }

  // ── REVIEWED → DRAFT: chạy lại ───────────────────────────────────────────
  async rerunPeriod(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);
    if (period.status !== PayrollStatus.REVIEWED) {
      throw new BadRequestException('Chỉ có thể chạy lại kỳ lương ở trạng thái REVIEWED');
    }
    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollStatus.DRAFT },
    });
    return this.generatePayroll(periodId);
  }

  // ── Phê duyệt kỳ lương ───────────────────────────────────────────────────
  async approvePeriod(periodId: string, userId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);

    if (
      period.status !== PayrollStatus.PROCESSING &&
      period.status !== PayrollStatus.REVIEWED
    ) {
      throw new BadRequestException(
        'Chỉ có thể phê duyệt kỳ lương ở trạng thái PROCESSING hoặc REVIEWED',
      );
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: PayrollStatus.APPROVED,
        processedById: userId,
        processedAt: new Date(),
      },
      include: { records: { select: { grossSalary: true } } },
    });

    await this.engine.updateYtdAfterApproval(periodId);

    const totalSalary = updated.records.reduce((s, r) => s + Number(r.grossSalary), 0);
    await this.financeEventBus.emit({
      type: 'payroll.approved',
      refId: periodId,
      amount: totalSalary,
      userId,
    });

    // Ghi audit log — phê duyệt kỳ lương
    this.auditLog.log({
      userId,
      action: 'APPROVE',
      module: 'finance',
      entity: 'Payroll',
      entityId: periodId,
      newValues: { status: PayrollStatus.APPROVED, name: period.name },
    }).catch(() => {});

    return updated;
  }

  // ── Đánh dấu đã thanh toán → enqueue phiếu lương PDF ────────────────────
  async markPaid(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);

    if (period.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Chỉ có thể đánh dấu đã trả với kỳ lương đã APPROVED');
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollStatus.PAID },
    });

    // Async — không block response; lỗi sẽ được BullMQ retry
    this.payslipQueue.enqueueAll(periodId).catch(() => {});

    return updated;
  }

  // ── Lấy presigned URL của phiếu lương PDF ────────────────────────────────
  // requestUserId kept for API compatibility but ownership check removed (admin access needed)
  async getPayslipUrl(recordId: string, _requestUserId?: string): Promise<{ url: string | null; pending: boolean }> {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id: recordId },
      select: { payslipPath: true },
    });
    if (!record) throw new NotFoundException(`PayrollRecord ${recordId} không tìm thấy`);

    if (!record.payslipPath) {
      return { url: null, pending: true };
    }

    const url = await this.storage.presignedUrl(record.payslipPath, undefined, 3600);
    return { url, pending: false };
  }

  // ── E16G.7: Tính lương tháng 13 ──────────────────────────────────────────
  async calculate13thMonth(periodId: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);
    if (period.type !== PayrollPeriodType.MONTH_13) {
      throw new BadRequestException('Kỳ lương này không phải loại MONTH_13');
    }

    // Xác định năm của kỳ tháng 13 (lấy từ startDate)
    const year = new Date(period.startDate).getFullYear();
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd   = new Date(`${year}-12-31`);

    // Lấy toàn bộ PayrollRecord từ kỳ REGULAR đã APPROVED trong năm
    const regularRecords = await this.prisma.payrollRecord.findMany({
      where: {
        period: {
          type:   PayrollPeriodType.REGULAR,
          status: PayrollStatus.APPROVED,
          startDate: { gte: yearStart, lte: yearEnd },
        },
      },
      select: {
        employeeId: true,
        baseSalary:  true,
        overtimePay: true,
        bonus:       true,
        // allowances KHÔNG tính (theo spec)
      },
    });

    if (regularRecords.length === 0) {
      return { periodId, generated: 0, message: 'Không có kỳ lương REGULAR APPROVED nào trong năm' };
    }

    // Group by employeeId: tổng month13_base và đếm số kỳ
    type EmpAccum = { totalBase: number; months: number };
    const map = new Map<string, EmpAccum>();
    for (const r of regularRecords) {
      const base = Number(r.baseSalary) + Number(r.overtimePay) + Number(r.bonus);
      const cur = map.get(r.employeeId) ?? { totalBase: 0, months: 0 };
      map.set(r.employeeId, { totalBase: cur.totalBase + base, months: cur.months + 1 });
    }

    let generated = 0;
    for (const [employeeId, { totalBase, months }] of map) {
      const month13 = Math.round(totalBase / months); // bình quân tháng
      const pit     = month13 >= 2_000_000 ? Math.round(month13 * 0.1) : 0;
      const net     = month13 - pit;

      // Upsert PayrollRecord cho kỳ MONTH_13
      await this.prisma.payrollRecord.upsert({
        where: { periodId_employeeId: { periodId, employeeId } },
        create: {
          periodId,
          employeeId,
          workDays:     0,
          baseSalary:   month13,   // lưu bình quân vào baseSalary để hiện thị
          grossSalary:  month13,
          overtimePay:  0,
          allowances:   0,
          deductions:   0,
          bonus:        0,
          bhxhEmployee: 0,
          bhytEmployee: 0,
          bhtnEmployee: 0,
          bhxhEmployer: 0,
          bhytEmployer: 0,
          bhtnEmployer: 0,
          tnldEmployer: 0,
          taxableIncome: month13,
          selfDeduction: 0,
          dependentDeduction: 0,
          dependentCount: 0,
          pitAmount:    pit,
          totalLaborCost: month13,
          netSalary:    net,
          note:         `Tháng 13 — BQ ${months} tháng REGULAR trong năm ${year}`,
        },
        update: {
          baseSalary:   month13,
          grossSalary:  month13,
          taxableIncome: month13,
          pitAmount:    pit,
          totalLaborCost: month13,
          netSalary:    net,
          note:         `Tháng 13 — BQ ${months} tháng REGULAR trong năm ${year}`,
        },
      });
      generated++;
    }

    // Cập nhật trạng thái kỳ → PROCESSING
    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data:  { status: PayrollStatus.PROCESSING },
    });

    return { periodId, generated, year, status: PayrollStatus.PROCESSING };
  }

  // ── L-10: Payslip Excel ───────────────────────────────────────────────────

  async generatePayslipExcel(recordId: string): Promise<Buffer> {
    const record = await this.prisma.payrollRecord.findUnique({
      where: { id: recordId },
      include: {
        employee: { select: { fullName: true, code: true, email: true } },
        period:   { select: { name: true, startDate: true, endDate: true } },
        employeeAllowances: { include: { allowanceType: { select: { name: true } } } },
        employeeBonuses:    true,
      },
    });
    if (!record) throw new NotFoundException(`PayrollRecord ${recordId} không tìm thấy`);

    const fmt = (n: number | null | undefined) =>
      (n ?? 0).toLocaleString('vi-VN');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phiếu lương');
    ws.columns = [
      { key: 'label',  width: 36 },
      { key: 'value',  width: 24 },
    ];

    const title = ws.addRow(['PHIẾU LƯƠNG — LOOP 360']);
    title.font = { bold: true, size: 14 };
    ws.mergeCells(`A1:B1`);

    ws.addRow([]);
    ws.addRow(['Nhân viên', `${record.employee.code} — ${record.employee.fullName}`]);
    ws.addRow(['Email', record.employee.email ?? '—']);
    ws.addRow(['Kỳ lương', record.period.name]);
    ws.addRow(['Thời gian', `${new Date(record.period.startDate).toLocaleDateString('vi-VN')} → ${new Date(record.period.endDate).toLocaleDateString('vi-VN')}`]);
    ws.addRow([]);

    // Thông tin công
    ws.addRow(['=== CÔNG VÀ GIỜ ===', '']).font = { bold: true };
    ws.addRow(['Số ngày công', Number(record.workDays)]);
    ws.addRow(['Ngày nghỉ phép (có lương)', Number(record.paidLeaveDays)]);
    ws.addRow(['Ngày nghỉ không lương', Number(record.unpaidLeaveDays)]);
    ws.addRow(['Giờ tăng ca', Number(record.overtimeHours)]);
    ws.addRow([]);

    // Thu nhập
    ws.addRow(['=== THU NHẬP ===', '']).font = { bold: true };
    ws.addRow(['Lương cơ bản', fmt(Number(record.baseSalary))]);
    ws.addRow(['Lương tăng ca', fmt(Number(record.overtimePay))]);

    for (const allowance of record.employeeAllowances) {
      ws.addRow([`Phụ cấp: ${allowance.allowanceType.name}`, fmt(Number(allowance.amount))]);
    }
    for (const bonus of record.employeeBonuses) {
      ws.addRow([`Thưởng: ${(bonus as any).note ?? 'Thưởng'}`, fmt(Number((bonus as any).amount ?? 0))]);
    }
    ws.addRow(['Tổng thu nhập gộp (Gross)', fmt(Number(record.grossSalary))]).font = { bold: true };
    ws.addRow([]);

    // Khấu trừ
    ws.addRow(['=== KHẤU TRỪ ===', '']).font = { bold: true };
    ws.addRow(['BHXH (NLĐ 8%)', fmt(Number(record.bhxhEmployee))]);
    ws.addRow(['BHYT (NLĐ 1.5%)', fmt(Number(record.bhytEmployee))]);
    ws.addRow(['BHTN (NLĐ 1%)', fmt(Number(record.bhtnEmployee))]);
    ws.addRow(['Thu nhập chịu thuế', fmt(Number(record.taxableIncome))]);
    ws.addRow(['Giảm trừ bản thân', fmt(Number(record.selfDeduction))]);
    ws.addRow(['Giảm trừ người phụ thuộc', fmt(Number(record.dependentDeduction))]);
    ws.addRow(['Thuế TNCN', fmt(Number(record.pitAmount))]);
    ws.addRow([]);

    // Lương thực nhận
    const netRow = ws.addRow(['LƯƠNG THỰC NHẬN (NET)', fmt(Number(record.netSalary))]);
    netRow.font = { bold: true, size: 12 };
    netRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ── Phiếu lương của user hiện tại ──────────────────────────────────────────
  async getMyRecords(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { user: { id: userId } },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Nhân viên không tìm thấy');

    const records = await this.prisma.payrollRecord.findMany({
      where: { employeeId: employee.id },
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            user: { select: { id: true, name: true, email: true } },
            orgUnit: { select: { name: true } },
            position: { select: { jobTitle: { select: { name: true } } } },
          },
        },
        period: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
      orderBy: { period: { startDate: 'desc' } },
    });

    return records.map(r => ({
      ...r,
      periodName: r.period.name,
      periodStart: r.period.startDate,
      periodEnd: r.period.endDate,
    }));
  }
}
