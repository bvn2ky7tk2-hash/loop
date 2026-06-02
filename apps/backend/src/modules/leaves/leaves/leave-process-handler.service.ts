import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus } from '../generated/prisma';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';

/**
 * Singleton service lắng nghe ProcessEventBus và cập nhật trạng thái đơn nghỉ phép.
 * Tách ra khỏi LeavesService (REQUEST-scoped) vì onModuleInit không được gọi
 * cho REQUEST-scoped providers.
 */
@Injectable()
export class LeaveProcessHandlerService implements OnModuleInit {
  private readonly logger = new Logger(LeaveProcessHandlerService.name);

  constructor(
    private readonly eventBus: ProcessEventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
    this.logger.log('LeaveProcessHandlerService registered BullMQ worker');
  }

  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { processInstanceId: instanceId },
      include: { leaveType: { select: { id: true } } },
    });
    if (!leave) return;

    const decision = variables['decision'] as string | undefined;
    if (!decision) return;

    if (decision === 'APPROVED') {
      await this.prisma.$transaction(async (tx) => {
        await tx.leaveRequest.update({
          where: { id: leave.id },
          data: {
            status: LeaveStatus.APPROVED,
            approvedAt: new Date(),
            approvedById: (variables['approvedById'] as string) ?? null,
          },
        });
        // Cập nhật số ngày đã dùng trong năm
        const year = new Date(leave.startDate).getFullYear();
        await tx.leaveBalance.updateMany({
          where: { employeeId: leave.employeeId, leaveTypeId: leave.leaveTypeId, year },
          data: { usedDays: { increment: Number(leave.days) } },
        });
      });
    } else if (decision === 'REJECTED') {
      await this.prisma.leaveRequest.update({
        where: { id: leave.id },
        data: {
          status: LeaveStatus.REJECTED,
          rejectedReason: (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình',
        },
      });
    }
  }
}
