import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import { OtStatus } from '../generated/prisma';

/**
 * Singleton handler: lắng nghe ProcessEventBus khi quy trình duyệt tăng ca
 * (overtime-approval-v1) hoàn tất và cập nhật trạng thái OvertimeRequest.
 * Tách khỏi OvertimeService (REQUEST-scoped) vì onModuleInit không được gọi
 * cho REQUEST-scoped providers.
 */
@Injectable()
export class OvertimeProcessHandlerService implements OnModuleInit {
  private readonly logger = new Logger(OvertimeProcessHandlerService.name);

  constructor(
    private readonly eventBus: ProcessEventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
    this.logger.log('OvertimeProcessHandlerService registered');
  }

  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const ot = await this.prisma.overtimeRequest.findFirst({
      where: { processInstanceId: instanceId },
    });
    if (!ot) return;

    const decision = variables['decision'] as string | undefined;
    if (!decision) return;

    if (decision === 'APPROVED') {
      await this.prisma.overtimeRequest.update({
        where: { id: ot.id },
        data: {
          status:      OtStatus.APPROVED,
          approvedAt:  new Date(),
          approvedById: (variables['approvedById'] as string) ?? null,
        },
      });
      this.logger.log(`OvertimeRequest ${ot.id} → APPROVED via BPM`);
    } else if (decision === 'REJECTED') {
      await this.prisma.overtimeRequest.update({
        where: { id: ot.id },
        data: {
          status:         OtStatus.REJECTED,
          rejectedReason: (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình',
        },
      });
      this.logger.log(`OvertimeRequest ${ot.id} → REJECTED via BPM`);
    }
  }
}
