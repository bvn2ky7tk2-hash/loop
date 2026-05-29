import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseStatus, DefinitionStatus } from '../generated/prisma';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApproveExpenseDto } from './dto/approve-expense.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import { FinanceEventBus } from '../accounting/finance-event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const EXPENSE_INCLUDE = {
  submittedBy: { select: { id: true, name: true } },
  approvedBy:  { select: { id: true, name: true } },
  project:     { select: { id: true, name: true } },
} as const;

@Injectable()
export class ExpensesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: ProcessEventBus,
    private readonly financeEventBus: FinanceEventBus,
    private readonly auditLog: AuditLogService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
  }

  // Xử lý kết quả process khi hoàn tất — cập nhật trạng thái phiếu chi
  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const expense = await this.prisma.expense.findFirst({
      where: { processInstanceId: instanceId },
    });
    if (!expense) return;

    const decision = variables['decision'] as string | undefined;
    if (!decision) return;

    if (decision === 'APPROVED') {
      await this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          status: 'APPROVED' as any,
          approvedAt: new Date(),
          approvedById: (variables['approvedById'] as string) ?? null,
        },
      });
    } else if (decision === 'REJECTED') {
      await this.prisma.expense.update({
        where: { id: expense.id },
        data: {
          status: 'REJECTED' as any,
          rejectedReason: (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình',
        },
      });
    }
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
    const definition = await this.prisma.processDefinition.findUnique({
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
      this.financeEventBus.emit({
        type: 'expense.approved',
        refId: id,
        amount: Number(updated.totalAmount),
        userId: approverId,
      });
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
