import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import { HrDecisionStatus } from '../generated/prisma';

/**
 * Singleton handler: lắng nghe ProcessEventBus khi quy trình duyệt quyết định
 * nhân sự (hr-decision-approval) hoàn tất và cập nhật trạng thái HrDecision.
 * Tách khỏi HrDecisionsService (REQUEST-scoped) vì onModuleInit không được gọi
 * cho REQUEST-scoped providers.
 */
@Injectable()
export class HrDecisionProcessHandlerService implements OnModuleInit {
  private readonly logger = new Logger(HrDecisionProcessHandlerService.name);

  constructor(
    private readonly eventBus: ProcessEventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
    this.logger.log('HrDecisionProcessHandlerService registered');
  }

  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const dec = await this.prisma.hrDecision.findFirst({
      where: { processInstanceId: instanceId },
    });
    if (!dec) return;

    const decision = variables['decision'] as string | undefined;
    if (!decision) return;

    if (decision === 'APPROVED') {
      await this.prisma.hrDecision.update({
        where: { id: dec.id },
        data:  { status: HrDecisionStatus.APPROVED },
      });
      this.logger.log(`HrDecision ${dec.id} → APPROVED via BPM`);
    } else if (decision === 'REJECTED') {
      await this.prisma.hrDecision.update({
        where: { id: dec.id },
        data: {
          status: HrDecisionStatus.REJECTED,
          notes:  (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình',
        },
      });
      this.logger.log(`HrDecision ${dec.id} → REJECTED via BPM`);
    }
  }
}
