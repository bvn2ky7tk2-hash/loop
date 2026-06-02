import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HrEventBus, HrEvent } from '../common/events/hr-event-bus.service';

/**
 * E18.4 — Tự động hóa vòng đời hợp đồng qua HrEventBus.
 * Lắng nghe sự kiện contract.expiring (daysLeft=0) để khởi tạo
 * BPM process gia hạn cho PROBATION và các loại FIXED.
 */
@Injectable()
export class ContractLifecycleHandlerService implements OnModuleInit {
  private readonly logger = new Logger(ContractLifecycleHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hrEventBus: HrEventBus,
  ) {}

  onModuleInit() {
    this.hrEventBus.on('contract.expiring', async (event: HrEvent) => {
      const daysLeft = (event.metadata?.['daysLeft'] as number) ?? -1;
      await this.handleContractExpiring(event.refId, daysLeft);
    });
    this.logger.log('ContractLifecycleHandlerService: đã đăng ký lắng nghe contract.expiring');
  }

  private async handleContractExpiring(contractId: string, daysLeft: number): Promise<void> {
    // Chỉ xử lý khi đúng ngày hết hạn (daysLeft === 0)
    if (daysLeft !== 0) return;

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { employee: { select: { id: true, userId: true } } },
    });

    if (!contract) {
      this.logger.warn(`ContractLifecycleHandler: không tìm thấy contract ${contractId}`);
      return;
    }

    // Bỏ qua nếu đã xử lý hoặc không còn ACTIVE
    if (contract.autoExpireHandled || contract.status !== 'ACTIVE') return;

    // Chỉ kích hoạt BPM cho PROBATION và FIXED (có thời hạn cố định)
    const fixedTypes = ['PROBATION', 'FIXED_12', 'FIXED_24', 'FIXED_36'];
    if (!fixedTypes.includes(contract.type as string)) return;

    // Tìm ProcessDefinition contract-renewal-v1 đang ACTIVE
    const definition = await this.prisma.processDefinition.findFirst({
      where: { key: 'contract-renewal-v1', status: 'ACTIVE' as any },
    });

    if (!definition) {
      this.logger.warn(
        'ContractLifecycleHandler: không tìm thấy ProcessDefinition key=contract-renewal-v1 status=ACTIVE — bỏ qua',
      );
      return;
    }

    const startedBy = contract.employee?.userId ?? contract.employeeId;

    await this.prisma.processInstance.create({
      data: {
        definitionId: definition.id,
        startedBy,
        status: 'RUNNING' as any,
        variables: {
          contractId: contract.id,
          employeeId: contract.employeeId,
          contractType: contract.type,
          renewalCount: contract.renewalCount,
        } as any,
        tokenState: {} as any,
        ...(definition.tenantId ? { tenantId: definition.tenantId } : {}),
      },
    });

    // Mark đã xử lý để tránh trigger lại
    await this.prisma.contract.update({
      where: { id: contract.id },
      data: { autoExpireHandled: true },
    });

    this.logger.log(
      `ContractLifecycleHandler: đã tạo ProcessInstance contract-renewal-v1 cho contract ${contractId} (type=${contract.type})`,
    );
  }
}
