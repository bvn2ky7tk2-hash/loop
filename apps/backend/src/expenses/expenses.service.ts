import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseStatus, DefinitionStatus } from '../generated/prisma';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApproveExpenseDto } from './dto/approve-expense.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import { FinanceEventBus } from '../accounting/finance-event-bus.service';

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
    return updated;
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
