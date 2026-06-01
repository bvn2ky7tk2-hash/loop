import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';

/**
 * Singleton handler: lắng nghe ProcessEventBus khi quy trình giải trình
 * chấm công (attendance-explanation-v1) hoàn tất và cập nhật trạng thái.
 *
 * Tách khỏi AttendanceExplanationService (REQUEST-scoped) vì onModuleInit
 * không được gọi cho REQUEST-scoped providers.
 */
@Injectable()
export class AttendanceExplanationProcessHandlerService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceExplanationProcessHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: ProcessEventBus,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
    this.logger.log('AttendanceExplanationProcessHandler registered BullMQ worker');
  }

  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const explanationId = variables['attendanceExplanationId'] as string | undefined;
    if (!explanationId) return;

    const explanation = await this.prisma.attendanceExplanation.findFirst({
      where: { processInstanceId: instanceId },
      include: { attendanceRecord: true },
    });
    if (!explanation) return;

    const decision = (variables['decision'] as string | undefined)?.toUpperCase();
    if (!decision) return;

    if (decision === 'APPROVED') {
      await this.prisma.attendanceExplanation.update({
        where: { id: explanation.id },
        data: {
          status: 'APPROVED',
          reviewedById: (variables['approvedById'] as string) ?? null,
          reviewedAt: new Date(),
        },
      });

      // Áp dụng hiệu ứng lên bảng công nếu có AttendanceRecord
      if (explanation.attendanceRecordId) {
        await this.applyEffect(explanation);
      }

      this.logger.log(`Explanation ${explanation.id} APPROVED via BPM`);

    } else if (decision === 'REJECTED') {
      await this.prisma.attendanceExplanation.update({
        where: { id: explanation.id },
        data: {
          status: 'REJECTED',
          reviewedById: (variables['approvedById'] as string) ?? null,
          reviewedAt: new Date(),
          rejectReason: (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình BPM',
        },
      });

      this.logger.log(`Explanation ${explanation.id} REJECTED via BPM`);
    }
  }

  private async applyEffect(explanation: any): Promise<void> {
    const recordId = explanation.attendanceRecordId;
    if (!recordId) return;

    const updateData: Record<string, unknown> = {};

    switch (explanation.type) {
      case 'LATE_ARRIVAL':
        updateData.lateMinutes = 0;
        break;
      case 'EARLY_DEPARTURE':
        updateData.earlyLeaveMinutes = 0;
        break;
      case 'MISSING_CHECKIN':
        if (explanation.requestedCheckIn) {
          updateData.checkIn = explanation.requestedCheckIn;
          updateData.lateMinutes = 0;
        }
        break;
      case 'MISSING_CHECKOUT':
        if (explanation.requestedCheckOut) {
          updateData.checkOut = explanation.requestedCheckOut;
          updateData.earlyLeaveMinutes = 0;
        }
        break;
      case 'BUSINESS_TRIP':
      case 'ONSITE':
      case 'WFH':
        updateData.status = 'PRESENT';
        updateData.lateMinutes = 0;
        updateData.earlyLeaveMinutes = 0;
        updateData.totalHours = 8;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.attendanceRecord.update({
        where: { id: recordId },
        data: updateData,
      });
    }
  }
}
