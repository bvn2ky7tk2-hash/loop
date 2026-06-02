import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { HrEventBus } from '../common/events/hr-event-bus.service';
import { TenantRunner } from '../common/cls/tenant-runner.service';

/**
 * E18.1 — Cron task kiểm tra HĐ sắp hết hạn và tự động expire.
 * Chạy lúc 8:00 sáng mỗi ngày.
 *
 * Không inject ContractsService trực tiếp vì ContractsService là REQUEST-scoped.
 * Thay vào đó dùng PrismaService trực tiếp (singleton-safe).
 */
@Injectable()
export class ContractExpiryTask {
  private readonly logger = new Logger(ContractExpiryTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hrEventBus: HrEventBus,
    private readonly tenantRunner: TenantRunner,
  ) {}

  @Cron('0 8 * * *')
  async handleContractExpiry(): Promise<void> {
    await this.tenantRunner.forEachTenant(async (tenantId) => {
    this.logger.log('[ContractExpiryTask] Bắt đầu kiểm tra HĐ sắp hết hạn...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const THRESHOLDS = [60, 30, 15, 7, 3];

    const adminUsers = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
      take: 50,
    });

    // 1. Gửi cảnh báo sắp hết hạn theo từng ngưỡng
    for (const days of THRESHOLDS) {
      const dateFrom = new Date(today);
      dateFrom.setDate(dateFrom.getDate() + days);

      const dateTo = new Date(dateFrom);
      dateTo.setDate(dateTo.getDate() + 1);

      const contracts = await this.prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          endDate: { gte: dateFrom, lt: dateTo },
        },
        include: {
          employee: { select: { id: true, fullName: true, userId: true } },
        },
        take: 200,
      });

      for (const contract of contracts) {
        const title = `Hợp đồng sắp hết hạn — còn ${days} ngày`;
        const body = `Hợp đồng của ${contract.employee.fullName} sẽ hết hạn vào ${contract.endDate?.toLocaleDateString('vi-VN')}.`;
        const link = `/hr/contracts/${contract.id}`;

        // Notify employee (nếu có tài khoản)
        if (contract.employee.userId) {
          await this.prisma.notification.create({
            data: {
              userId: contract.employee.userId,
              type: 'CONTRACT_EXPIRING' as any,
              title,
              body,
              link,
              entityType: 'Contract',
              entityId: contract.id,
            },
          });
        }

        // Notify admin/HR
        for (const admin of adminUsers) {
          await this.prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'CONTRACT_EXPIRING' as any,
              title,
              body,
              link,
              entityType: 'Contract',
              entityId: contract.id,
            },
          });
        }
      }

      if (contracts.length > 0) {
        this.logger.log(`[ContractExpiryTask] Cảnh báo ${contracts.length} HĐ còn ${days} ngày`);
      }
    }

    // 2. Tự động chuyển ACTIVE → EXPIRED cho HĐ đã quá ngày kết thúc
    //    và emit HrEventBus event để lifecycle handler xử lý BPM renewal
    const expired = await this.prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        autoExpireHandled: false,
        endDate: { lt: today },
      },
      include: { employee: { select: { userId: true } } },
      take: 500,
    });

    if (expired.length > 0) {
      // Emit event trước khi update để lifecycle handler có thể đọc status=ACTIVE
      for (const contract of expired) {
        await this.hrEventBus.emit({
          type: 'contract.expiring',
          refId: contract.id,
          employeeId: contract.employeeId,
          userId: contract.employee.userId ?? undefined,
          metadata: { daysLeft: 0 },
        });
      }

      await this.prisma.contract.updateMany({
        where: { id: { in: expired.map(c => c.id) } },
        data: { status: 'EXPIRED' },
      });
      this.logger.log(`[ContractExpiryTask] Đã expire ${expired.length} HĐ và emit contract.expiring events`);
    }

    this.logger.log('[ContractExpiryTask] Hoàn tất.');
    });
  }
}
