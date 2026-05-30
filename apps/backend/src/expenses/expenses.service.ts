import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
  Inject,
  Logger,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { ExpenseStatus, DefinitionStatus } from '../generated/prisma';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApproveExpenseDto } from './dto/approve-expense.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { FinanceEventBus } from '../accounting/finance-event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BudgetService } from '../budget/budget.service';

const EXPENSE_INCLUDE = {
  submittedBy: { select: { id: true, name: true } },
  approvedBy:  { select: { id: true, name: true } },
  project:     { select: { id: true, name: true } },
} as const;

@Injectable({ scope: Scope.REQUEST })
export class ExpensesService extends TenantAwareService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeEventBus: FinanceEventBus,
    private readonly auditLog: AuditLogService,
    @Inject(REQUEST) req: any,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly budgetService?: BudgetService,
  ) {
    super(req);
  }

  // ── Danh sách phiếu chi ────────────────────────────────────────────────────
  async findAll(
    submittedById?: string,
    status?: ExpenseStatus,
    projectId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (submittedById) where.submittedById = submittedById;
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: EXPENSE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ── Chi tiết phiếu chi ─────────────────────────────────────────────────────
  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        ...EXPENSE_INCLUDE,
        items: true,
      },
    });
    if (!expense) throw new NotFoundException(`Phiếu chi ${id} không tìm thấy`);
    return expense;
  }

  // ── Tạo phiếu chi ──────────────────────────────────────────────────────────
  async create(dto: CreateExpenseDto, submittedById: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Phiếu chi phải có ít nhất một khoản chi tiết');
    }

    // Kiểm tra ngân sách trước khi tạo phiếu chi (nếu BudgetService khả dụng)
    if (this.budgetService && (dto as any).orgUnitId && dto.category && dto.totalAmount) {
      const currentYear = new Date().getFullYear();
      const budgetCheck = await this.budgetService.checkBudget(
        (dto as any).orgUnitId,
        dto.category as string,
        currentYear,
        Number(dto.totalAmount),
      );

      if (!budgetCheck.allowed) {
        throw new ForbiddenException(
          `Ngân sách không đủ: còn lại ${budgetCheck.remaining.toLocaleString('vi-VN')} VND cho danh mục "${dto.category}"`,
        );
      }

      if (budgetCheck.isWarning) {
        this.logger.warn(
          `Cảnh báo ngân sách: phiếu chi danh mục "${dto.category}" — đã dùng ${budgetCheck.usedPct.toFixed(1)}% ngân sách`,
        );
      }
    }

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          title:        dto.title,
          category:     dto.category,
          totalAmount:  dto.totalAmount,
          currency:     dto.currency,
          projectId:    dto.projectId ?? null,
          employeeId:   dto.employeeId ?? null,
          note:         dto.note ?? null,
          submittedById,
          status:       ExpenseStatus.PENDING,
          items: {
            create: dto.items.map((item) => ({
              description: item.description,
              amount:      item.amount,
            })),
          },
        },
        include: {
          ...EXPENSE_INCLUDE,
          items: true,
        },
      });

      return created;
    });

    // Tự động start process expense-approval nếu đang ACTIVE
    const definition = await this.prisma.processDefinition.findFirst({
      where: { key: 'expense-approval' },
      select: { id: true, status: true },
    });

    if (definition?.status === DefinitionStatus.ACTIVE) {
      const instance = await this.prisma.processInstance.create({
        data: {
          definitionId: definition.id,
          startedBy: submittedById,
          status: 'RUNNING' as any,
          variables: {
            expenseId: expense.id,
            submittedById,
            title: expense.title,
            category: expense.category,
            totalAmount: Number(expense.totalAmount),
            currency: expense.currency,
          } as any,
          tokenState: {} as any,
        },
      });
      await this.prisma.expense.update({
        where: { id: expense.id },
        data: { processInstanceId: instance.id },
      });
    }

    return expense;
  }

  // ── Phê duyệt / Từ chối phiếu chi ─────────────────────────────────────────
  async approve(id: string, dto: ApproveExpenseDto, approverId: string) {
    const expense = await this.findOne(id);

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể duyệt phiếu chi ở trạng thái PENDING');
    }

    // Lý do từ chối là bắt buộc khi REJECTED
    if (dto.status === ExpenseStatus.REJECTED && !dto.rejectedReason) {
      throw new BadRequestException('Lý do từ chối là bắt buộc khi từ chối phiếu chi');
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status:         dto.status,
        approvedById:   approverId,
        approvedAt:     new Date(),
        rejectedReason: dto.rejectedReason ?? null,
      },
      include: { ...EXPENSE_INCLUDE, items: true },
    });

    if (dto.status === ExpenseStatus.APPROVED) {
      await this.financeEventBus.emit({
        type: 'expense.approved',
        refId: id,
        amount: Number(updated.totalAmount),
        userId: approverId,
      });

      // Ghi giao dịch ngân sách ACTUAL khi expense được phê duyệt
      if (this.budgetService && (expense as any).orgUnitId && expense.category) {
        const currentYear = new Date().getFullYear();
        const budgetCheck = await this.budgetService.checkBudget(
          (expense as any).orgUnitId,
          expense.category as string,
          currentYear,
          0,
        ).catch(() => null);

        if (budgetCheck?.lineId) {
          await this.budgetService
            .recordTransaction(
              budgetCheck.lineId,
              'EXPENSE',
              id,
              Number(updated.totalAmount),
              'ACTUAL',
            )
            .catch((err: Error) =>
              this.logger.error(`Lỗi ghi giao dịch ngân sách cho expense ${id}: ${err.message}`),
            );
        }
      }
    }

    // Notify requester về kết quả phê duyệt
    if (this.notificationsService && expense.submittedById) {
      const isApproved = dto.status === ExpenseStatus.APPROVED;
      this.notificationsService.createInApp(expense.submittedById, {
        type: isApproved ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
        title: isApproved ? 'Phiếu chi đã được duyệt' : 'Phiếu chi bị từ chối',
        body: isApproved
          ? `Phiếu chi "${expense.title}" đã được phê duyệt`
          : `Phiếu chi "${expense.title}" bị từ chối${dto.rejectedReason ? ': ' + dto.rejectedReason : ''}`,
        link: '/finance/expenses',
        entityType: 'EXPENSE',
        entityId: id,
      }).catch(() => {});
    }

    // Ghi audit log — phê duyệt/từ chối phiếu chi
    this.auditLog.log({
      userId: approverId,
      action: dto.status === ExpenseStatus.APPROVED ? 'APPROVE' : 'REJECT',
      module: 'finance',
      entity: 'Expense',
      entityId: id,
      newValues: { status: dto.status, rejectedReason: dto.rejectedReason },
    }).catch(() => {});

    return updated;
  }

  // ── Export Excel ───────────────────────────────────────────────────────────
  async exportExcel(): Promise<Buffer> {
    const expenses = await this.prisma.expense.findMany({
      include: EXPENSE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phiếu chi');

    ws.columns = [
      { header: 'Tiêu đề',     key: 'title',       width: 30 },
      { header: 'Danh mục',    key: 'category',    width: 15 },
      { header: 'Tổng tiền',   key: 'totalAmount', width: 15 },
      { header: 'Trạng thái',  key: 'status',      width: 14 },
      { header: 'Người nộp',   key: 'submittedBy', width: 22 },
      { header: 'Ngày tạo',    key: 'createdAt',   width: 13 },
    ];

    ws.getRow(1).font = { bold: true };

    expenses.forEach((e) => {
      ws.addRow({
        title:       e.title,
        category:    e.category,
        totalAmount: Number(e.totalAmount),
        status:      e.status,
        submittedBy: (e as { submittedBy?: { name?: string } }).submittedBy?.name ?? '',
        createdAt:   new Date(e.createdAt).toLocaleDateString('vi-VN'),
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // ── Xóa phiếu chi (chỉ khi PENDING) ───────────────────────────────────────
  async delete(id: string) {
    const expense = await this.findOne(id);

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể xóa phiếu chi ở trạng thái PENDING');
    }

    await this.prisma.expense.delete({ where: { id } });
  }
}
