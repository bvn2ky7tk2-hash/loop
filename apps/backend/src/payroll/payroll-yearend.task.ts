import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PayrollEngineService } from './payroll-engine.service';
import { TenantRunner } from '../common/cls/tenant-runner.service';

/**
 * E16.3 — Cron task quyết toán nghỉ phép cuối năm.
 * Chạy lúc 00:00 ngày 25/12 hàng năm.
 *
 * PayrollEngineService là singleton-safe nên inject trực tiếp được.
 */
@Injectable()
export class PayrollYearendTask {
  private readonly logger = new Logger(PayrollYearendTask.name);

  constructor(
    private readonly payrollEngineService: PayrollEngineService,
    private readonly tenantRunner: TenantRunner,
  ) {}

  @Cron('0 0 25 12 *')
  async handleYearEndLeaveSettlement(): Promise<void> {
    await this.tenantRunner.forEachTenant(async (tenantId) => {
      this.logger.log('[PayrollYearendTask] Bắt đầu quyết toán nghỉ phép cuối năm...');

      try {
        const result = await this.payrollEngineService.yearEndLeaveSettlement();
        this.logger.log(
          `[PayrollYearendTask] Hoàn tất — đã xử lý ${result.processed} bản ghi nghỉ phép.`,
        );
      } catch (err) {
        this.logger.error('[PayrollYearendTask] Lỗi khi quyết toán nghỉ phép cuối năm', err);
      }
    });
  }
}
