import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';

/**
 * Singleton service lắng nghe ProcessEventBus và cập nhật trạng thái phiếu chi.
 * Tách ra khỏi ExpensesService (REQUEST-scoped) vì onModuleInit không được gọi
 * cho REQUEST-scoped providers.
 */
@Injectable()
export class ExpenseProcessHandlerService implements OnModuleInit {
  private readonly logger = new Logger(ExpenseProcessHandlerService.name);

  constructor(
    private readonly eventBus: ProcessEventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
    this.logger.log('ExpenseProcessHandlerService registered BullMQ worker');
  }

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
}
