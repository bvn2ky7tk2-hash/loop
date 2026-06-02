import { Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../prisma/prisma.service';
import { CLS_TENANT_ID } from './cls-keys';
import { isTenantEnforced, getDefaultTenantId } from '../config/tenant.config';

/**
 * Chạy 1 hàm cho MỖI tenant active, mỗi lần trong 1 CLS context riêng → Prisma
 * tenant-extension tự scope query theo đúng tenant đó. Dùng cho cron/background
 * (nơi không có HTTP request nên CLS rỗng).
 *
 * On-prem (enforcement tắt): chạy đúng 1 lần với default tenant.
 */
@Injectable()
export class TenantRunner {
  private readonly logger = new Logger(TenantRunner.name);

  constructor(
    private readonly cls: ClsService,
    private readonly prisma: PrismaService,
  ) {}

  async forEachTenant(fn: (tenantId: string | undefined) => Promise<void>): Promise<void> {
    if (!isTenantEnforced()) {
      return this.cls.run(async () => {
        const def = getDefaultTenantId();
        if (def) this.cls.set(CLS_TENANT_ID, def);
        await fn(def);
      });
    }

    // Tenant ∈ GLOBAL allowlist → findMany này KHÔNG bị inject, lấy đủ mọi tenant.
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const t of tenants) {
      await this.cls.run(async () => {
        this.cls.set(CLS_TENANT_ID, t.id);
        try {
          await fn(t.id);
        } catch (err) {
          // Không để 1 tenant lỗi làm dừng các tenant còn lại.
          this.logger.error(`Cron lỗi cho tenant ${t.id}: ${(err as Error)?.message}`, (err as Error)?.stack);
        }
      });
    }
  }
}
