import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import { VehicleRequestStatus, VehicleStatus } from '../generated/prisma';

/**
 * Singleton listener: khi BPM process "vehicle-booking-approval" hoàn thành,
 * cập nhật trạng thái VehicleRequest dựa vào decision (APPROVED / REJECTED).
 */
@Injectable()
export class VehicleProcessHandlerService implements OnModuleInit {
  private readonly logger = new Logger(VehicleProcessHandlerService.name);

  constructor(
    private readonly eventBus: ProcessEventBus,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
    this.logger.log('VehicleProcessHandlerService registered');
  }

  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const vehicleRequest = await this.prisma.vehicleRequest.findFirst({
      where: { processInstanceId: instanceId },
    });
    if (!vehicleRequest) return;

    const decision = variables['decision'] as string | undefined;
    if (!decision) return;

    if (decision === 'APPROVED') {
      if (vehicleRequest.status !== VehicleRequestStatus.PENDING) return;
      await this.prisma.$transaction([
        this.prisma.vehicleRequest.update({
          where: { id: vehicleRequest.id },
          data: {
            status: VehicleRequestStatus.APPROVED,
            approvedById: (variables['approvedById'] as string) ?? null,
          },
        }),
        this.prisma.vehicle.update({
          where: { id: vehicleRequest.vehicleId },
          data: { status: VehicleStatus.IN_USE },
        }),
      ]);
      this.logger.log(`VehicleRequest ${vehicleRequest.id} → APPROVED via BPM`);
    } else if (decision === 'REJECTED') {
      if (vehicleRequest.status !== VehicleRequestStatus.PENDING) return;
      await this.prisma.vehicleRequest.update({
        where: { id: vehicleRequest.id },
        data: {
          status: VehicleRequestStatus.REJECTED,
          approvedById: (variables['approvedById'] as string) ?? null,
          rejectionReason: (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình',
        },
      });
      this.logger.log(`VehicleRequest ${vehicleRequest.id} → REJECTED via BPM`);
    }
  }
}
